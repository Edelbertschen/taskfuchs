import React, { useState } from 'react';
import { 
  DragDropContext, 
  Droppable, 
  Draggable,
  DropResult,
  DraggableProvided,
  DroppableProvided,
  DraggableStateSnapshot
} from '@hello-pangea/dnd';
import { ChevronDown, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';
import { TaskCard } from '../Tasks/TaskCard';
import type { Task, ProjectKanbanColumn } from '../../types';

interface ProjectListViewProps {
  columns: ProjectKanbanColumn[];
  tasks: Task[];
  showCompleted: boolean;
  isMinimalDesign: boolean;
  onAddTask: (columnId: string) => void;
}

export function ProjectListView({ 
  columns, 
  tasks, 
  showCompleted, 
  isMinimalDesign,
  onAddTask 
}: ProjectListViewProps) {
  const { t } = useTranslation();
  const { state, dispatch } = useApp();
  const [collapsedSections, setCollapsedSections] = useState<string[]>([]);
  const accentColor = state.preferences.accentColor;

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // Dropped outside any droppable
    if (!destination) return;

    // Dropped in same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const task = tasks.find(t => t.id === draggableId);
    if (!task) return;

    // Get source and destination column IDs
    const sourceColumnId = source.droppableId.replace('list-column-', '');
    const destColumnId = destination.droppableId.replace('list-column-', '');

    // Get tasks in destination column
    const destColumnTasks = tasks
      .filter(t => t.kanbanColumnId === destColumnId && (showCompleted || !t.completed))
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    // Calculate new position
    let newPosition: number;
    if (destColumnTasks.length === 0) {
      newPosition = 1000;
    } else if (destination.index === 0) {
      newPosition = (destColumnTasks[0].position || 1000) - 1000;
    } else if (destination.index >= destColumnTasks.length) {
      newPosition = (destColumnTasks[destColumnTasks.length - 1].position || 1000) + 1000;
    } else {
      const prevPos = destColumnTasks[destination.index - 1].position || 0;
      const nextPos = destColumnTasks[destination.index].position || prevPos + 2000;
      newPosition = Math.floor((prevPos + nextPos) / 2);
    }

    // Update task
    dispatch({
      type: 'UPDATE_TASK',
      payload: {
        ...task,
        kanbanColumnId: destColumnId,
        position: newPosition,
      }
    });
  };

  const toggleSection = (columnId: string) => {
    setCollapsedSections(prev => 
      prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4" style={{ paddingTop: '16px' }}>
        <div className="max-w-4xl mx-auto space-y-4">
          {columns.map((column) => {
            if (!column) return null;
            
            // Get tasks for this column
            const columnTasks = tasks
              .filter(task => task.kanbanColumnId === column.id)
              .sort((a, b) => (a.position || 0) - (b.position || 0));
            
            // Filter completed tasks if needed
            const visibleTasks = showCompleted 
              ? columnTasks 
              : columnTasks.filter(task => !task.completed);
            
            const isCollapsed = collapsedSections.includes(column.id);
            
            return (
              <div 
                key={column.id} 
                className={`rounded-xl overflow-hidden ${
                  isMinimalDesign
                    ? 'bg-gray-50 dark:bg-gray-800/50'
                    : 'bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm'
                }`}
              >
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(column.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                    isMinimalDesign 
                      ? 'hover:bg-gray-100 dark:hover:bg-gray-700/50' 
                      : 'hover:bg-white/60 dark:hover:bg-gray-700/60'
                  }`}
                >
                  <ChevronDown 
                    className={`w-4 h-4 text-gray-400 transition-transform ${
                      isCollapsed ? '-rotate-90' : ''
                    }`} 
                  />
                  <h3 
                    className="text-base font-semibold flex-1 text-left"
                    style={{ color: accentColor }}
                  >
                    {column.title}
                  </h3>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    isMinimalDesign
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      : 'bg-white/80 dark:bg-gray-700/80 text-gray-600 dark:text-gray-300'
                  }`}>
                    {visibleTasks.length} {visibleTasks.length === 1 ? t('common.task', 'Aufgabe') : t('common.tasks', 'Aufgaben')}
                  </span>
                </button>
                
                {/* Tasks - Droppable area */}
                {!isCollapsed && (
                  <Droppable droppableId={`list-column-${column.id}`}>
                    {(provided: DroppableProvided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`px-4 pb-3 min-h-[60px] transition-colors ${
                          snapshot.isDraggingOver 
                            ? 'bg-blue-50/50 dark:bg-blue-900/20' 
                            : ''
                        }`}
                        style={{
                          borderLeft: snapshot.isDraggingOver ? `3px solid ${accentColor}` : '3px solid transparent',
                        }}
                      >
                        {visibleTasks.length > 0 ? (
                          <div className="flex flex-col">
                            {visibleTasks.map((task, index) => (
                              <Draggable 
                                key={task.id} 
                                draggableId={task.id} 
                                index={index}
                              >
                                {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    style={{
                                      ...provided.draggableProps.style,
                                      marginBottom: '4px',
                                    }}
                                    className={`${
                                      snapshot.isDragging 
                                        ? 'shadow-lg ring-2 ring-blue-500/30 rounded-lg' 
                                        : ''
                                    }`}
                                  >
                                    <TaskCard
                                      task={task}
                                      isFirst={index === 0}
                                      isLast={index === visibleTasks.length - 1}
                                      currentColumn={column}
                                      isCompactListView={true}
                                    />
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        ) : (
                          <div 
                            className={`text-center py-4 text-sm rounded-lg border-2 border-dashed ${
                              isMinimalDesign
                                ? 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500'
                                : 'border-gray-200/60 dark:border-gray-700/60 text-gray-400/80 dark:text-gray-500/80'
                            }`}
                            style={{ 
                              minHeight: '44px',
                              borderColor: snapshot.isDraggingOver ? accentColor : undefined,
                              backgroundColor: snapshot.isDraggingOver ? `${accentColor}15` : undefined,
                            }}
                          >
                            {snapshot.isDraggingOver 
                              ? t('projects.drop_here', 'Hier ablegen')
                              : t('projects.no_tasks_in_column', 'Keine Aufgaben in dieser Spalte')
                            }
                          </div>
                        )}
                        {provided.placeholder}
                        
                        {/* Add Task Button */}
                        <button
                          onClick={() => onAddTask(column.id)}
                          className={`mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all border-2 border-dashed ${
                            isMinimalDesign
                              ? 'text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                              : 'text-gray-600 dark:text-gray-300 border-gray-300/80 dark:border-gray-600/80 hover:border-gray-400/90 dark:hover:border-gray-500/90 hover:bg-white/50 dark:hover:bg-gray-700/50'
                          }`}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = accentColor;
                            e.currentTarget.style.color = accentColor;
                            e.currentTarget.style.backgroundColor = `${accentColor}10`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '';
                            e.currentTarget.style.color = '';
                            e.currentTarget.style.backgroundColor = '';
                          }}
                        >
                          <Plus className="w-4 h-4" />
                          {t('projects.add_task', 'Aufgabe hinzufügen')}
                        </button>
                      </div>
                    )}
                  </Droppable>
                )}
              </div>
            );
          })}
          
          {columns.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              {t('projects.no_columns', 'Keine Spalten vorhanden')}
            </div>
          )}
        </div>
      </div>
    </DragDropContext>
  );
}
