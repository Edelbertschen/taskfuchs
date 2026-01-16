import React from 'react';
import { 
  DragDropContext, 
  Droppable, 
  Draggable,
  DropResult,
  DraggableProvided,
  DroppableProvided,
  DraggableStateSnapshot
} from '@hello-pangea/dnd';
import { Plus, Archive, CheckCircle, Circle, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';
import { TaskCard } from '../Tasks/TaskCard';
import type { Task, ProjectKanbanColumn } from '../../types';

interface ProjectBoardViewProps {
  columns: ProjectKanbanColumn[];
  tasks: Task[];
  showCompleted: boolean;
  isMinimalDesign: boolean;
  columnCount: number;
  isDarkMode: boolean;
  accentColor: string;
  onAddTask: (columnId: string) => void;
  onArchiveColumn: (columnId: string) => void;
}

export function ProjectBoardView({ 
  columns, 
  tasks, 
  showCompleted, 
  isMinimalDesign,
  columnCount,
  isDarkMode,
  accentColor,
  onAddTask,
  onArchiveColumn,
}: ProjectBoardViewProps) {
  const { t } = useTranslation();
  const { state, dispatch } = useApp();

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
    const sourceColumnId = source.droppableId.replace('board-column-', '');
    const destColumnId = destination.droppableId.replace('board-column-', '');

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

  // Calculate column width based on columnCount
  const columnWidth = `calc(${100 / columnCount}% - ${(columnCount - 1) * 12 / columnCount}px)`;

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div 
        className="flex gap-3 h-full overflow-x-auto pb-4"
        style={{ paddingTop: '16px' }}
      >
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
          
          const completedCount = columnTasks.filter(t => t.completed).length;
          const totalCount = columnTasks.length;
          
          return (
            <div 
              key={column.id}
              className={`flex-shrink-0 flex flex-col rounded-xl overflow-hidden ${
                isMinimalDesign
                  ? 'bg-gray-50 dark:bg-gray-800/50'
                  : 'bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm'
              }`}
              style={{ 
                width: columnWidth,
                minWidth: '280px',
                maxWidth: '400px',
              }}
            >
              {/* Column Header */}
              <div className={`flex items-center justify-between px-4 py-3 border-b ${
                isMinimalDesign
                  ? 'border-gray-200 dark:border-gray-700'
                  : 'border-gray-200/60 dark:border-gray-700/60'
              }`}>
                <div className="flex items-center gap-2">
                  <h3 
                    className="text-sm font-semibold"
                    style={{ color: accentColor }}
                  >
                    {column.title}
                  </h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    isMinimalDesign
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      : 'bg-white/80 dark:bg-gray-700/80 text-gray-600 dark:text-gray-300'
                  }`}>
                    {visibleTasks.length}
                  </span>
                </div>
                
                <div className="flex items-center gap-1">
                  {/* Archive completed button */}
                  {completedCount > 0 && (
                    <button
                      onClick={() => onArchiveColumn(column.id)}
                      className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      title={t('projects.archive_completed', 'Erledigte archivieren')}
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  )}
                  
                  {/* Add task button */}
                  <button
                    onClick={() => onAddTask(column.id)}
                    className="p-1.5 rounded-md transition-colors"
                    style={{ color: accentColor }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = `${accentColor}15`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '';
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* Tasks - Droppable area */}
              <Droppable droppableId={`board-column-${column.id}`}>
                {(provided: DroppableProvided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 overflow-y-auto p-2 min-h-[100px] transition-colors ${
                      snapshot.isDraggingOver 
                        ? 'bg-blue-50/50 dark:bg-blue-900/20' 
                        : ''
                    }`}
                    style={{
                      borderLeft: snapshot.isDraggingOver ? `3px solid ${accentColor}` : '3px solid transparent',
                    }}
                  >
                    {visibleTasks.length > 0 ? (
                      <div className="flex flex-col gap-2">
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
                                  // ✨ Ensure visibility during drag
                                  opacity: 1,
                                  visibility: 'visible',
                                }}
                                className={`${
                                  snapshot.isDragging 
                                    ? 'shadow-xl ring-2 ring-blue-500/40 rounded-lg z-[9999]' 
                                    : ''
                                }`}
                              >
                                <TaskCard
                                  task={task}
                                  isFirst={index === 0}
                                  isLast={index === visibleTasks.length - 1}
                                  currentColumn={column}
                                  disableInternalDnd={true}
                                  isDragging={snapshot.isDragging}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    ) : (
                      <div 
                        className={`flex items-center justify-center h-full min-h-[80px] text-sm rounded-lg border-2 border-dashed ${
                          isMinimalDesign
                            ? 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500'
                            : 'border-gray-200/60 dark:border-gray-700/60 text-gray-400/80 dark:text-gray-500/80'
                        }`}
                        style={{ 
                          borderColor: snapshot.isDraggingOver ? accentColor : undefined,
                          backgroundColor: snapshot.isDraggingOver ? `${accentColor}15` : undefined,
                        }}
                      >
                        {snapshot.isDraggingOver 
                          ? t('projects.drop_here', 'Hier ablegen')
                          : t('projects.no_tasks_in_column', 'Keine Aufgaben')
                        }
                      </div>
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
        
        {columns.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
            {t('projects.no_columns', 'Keine Spalten vorhanden')}
          </div>
        )}
      </div>
    </DragDropContext>
  );
}
