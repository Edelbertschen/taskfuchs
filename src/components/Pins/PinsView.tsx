import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { createPortal } from 'react-dom';
import { useAppTranslation } from '../../utils/i18nHelpers';
import { 
  DndContext, 
  DragOverlay, 
  DragStartEvent, 
  DragEndEvent,
  DragOverEvent,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  MouseSensor
} from '@dnd-kit/core';
import { 
  SortableContext, 
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  arrayMove,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Pin, 
  Plus, 
  Settings, 
  Edit2, 
  X, 
  MoreHorizontal,
  Trash2,
  FolderOpen,
  Sparkles,
  Columns,
  Focus
} from 'lucide-react';
import { TaskCard } from '../Tasks/TaskCard';
import { TaskColumn } from '../Tasks/TaskColumn';
import { TaskModal } from '../Tasks/TaskModal';
import { PinColumnManager } from './PinColumnManager';
import type { Task, PinColumn as PinColumnType } from '../../types';

export function PinsView() {
  const { state, dispatch } = useApp();
  const { actions, forms, titles, messages, pins } = useAppTranslation();
  const isMinimalDesign = state.preferences.minimalDesign;
  
  // States
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeColumn, setActiveColumn] = useState<PinColumnType | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnTitle, setEditingColumnTitle] = useState('');
  const [showColumnManager, setShowColumnManager] = useState(false);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 180,
        tolerance: 8,
      },
    }),
  );

  // Horizontal scroll container ref (for wheel/arrow navigation like Planner/Projects)
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [pinOffset, setPinOffset] = useState(0);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;

    const handleWheel = (e: WheelEvent) => {
      // Support both vertical and horizontal trackpad gestures
      // Choose the dominant axis to determine direction
      const absX = Math.abs(e.deltaX || 0);
      const absY = Math.abs(e.deltaY || 0);
      const raw = absX > absY ? e.deltaX : e.deltaY;
      if (raw === 0) return;
      e.preventDefault();
      e.stopPropagation();
      const visible = (state.preferences.columns.pinsVisible ?? state.preferences.columns.visible) || 3;
      const step = Math.sign(raw);
      const maxOffset = Math.max(0, state.pinColumns.length - visible);
      setPinOffset((prev) => Math.min(maxOffset, Math.max(0, prev + step)));
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const isInputFocused = !!activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.getAttribute('contenteditable') === 'true'
      );
      if (isInputFocused) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (!scrollContainerRef.current) return;
        e.preventDefault();
        const visible = (state.preferences.columns.pinsVisible ?? state.preferences.columns.visible) || 3;
        const maxOffset = Math.max(0, state.pinColumns.length - visible);
        const step = e.key === 'ArrowRight' ? 1 : -1;
        setPinOffset((prev) => Math.min(maxOffset, Math.max(0, prev + step)));
      }
    };

    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
    }
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheel as EventListener);
      }
      document.removeEventListener('keydown', handleKeyDown as EventListener);
    };
  }, [state.pinColumns.length, state.preferences.columns.visible, state.preferences.columns.pinsVisible]);

  // Get visible pin columns with offset like ProjectKanbanBoard
  const displayColumns = useMemo(() => {
    const allColumns = [...state.pinColumns].sort((a, b) => a.order - b.order);
    const visibleColumnCount = state.preferences.columns.pinsVisible ?? state.preferences.columns.visible;
    const sliced = allColumns.slice(pinOffset, pinOffset + (visibleColumnCount || allColumns.length));
    const result: (PinColumnType | null | undefined)[] = [...sliced];
    if ((visibleColumnCount || 0) > 0 && sliced.length < (visibleColumnCount || 0)) {
      result.push(null);
      while (result.length < (visibleColumnCount || 0)) result.push(undefined);
    }
    return result;
  }, [state.pinColumns, state.preferences.columns.visible, state.preferences.columns.pinsVisible, pinOffset]);

  // Tasks grouped by pin column
  const tasksByPinColumn = useMemo(() => {
    const tasksByColumn: Record<string, Task[]> = {};
    
    state.pinColumns.forEach(column => {
      tasksByColumn[column.id] = [];
    });

    state.tasks
      .filter(task => task.pinColumnId && !task.completed && !task.archived)
      .forEach(task => {
        if (tasksByColumn[task.pinColumnId!]) {
          tasksByColumn[task.pinColumnId!].push(task);
        }
      });

    Object.keys(tasksByColumn).forEach(columnId => {
      tasksByColumn[columnId].sort((a, b) => (a.position || 0) - (b.position || 0));
    });

    return tasksByColumn;
  }, [state.tasks, state.pinColumns]);

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeData = active.data.current;
    
    if (activeData?.type === 'pin-column') {
      const column = state.pinColumns.find(c => c.id === active.id);
      setActiveColumn(column || null);
    } else {
      const task = state.tasks.find(t => t.id === active.id);
      setActiveTask(task || null);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    setOverId(over ? over.id as string : null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveTask(null);
    setActiveColumn(null);
    setOverId(null);

    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Pin column reordering
    if (activeData?.type === 'pin-column' && overData?.type === 'pin-column') {
      const activeIndex = state.pinColumns.findIndex(col => col.id === active.id);
      const overIndex = state.pinColumns.findIndex(col => col.id === over.id);
      
      if (activeIndex !== overIndex) {
        const reorderedColumns = arrayMove(state.pinColumns, activeIndex, overIndex);
        const updatedColumns = reorderedColumns.map((col, index) => ({
          ...col,
          order: index,
          updatedAt: new Date().toISOString()
        }));
        
        dispatch({
          type: 'REORDER_PIN_COLUMNS',
          payload: updatedColumns
        });
      }
      return;
    }

    // Task drag & drop
    if (!activeTask || activeData?.type !== 'task') return;

    const activeId = active.id as string;
    const overId = over.id as string;
    
    // Dropping on pin column
    const targetPinColumn = state.pinColumns.find(col => col.id === overId);
    if (targetPinColumn) {
      const columnTasks = state.tasks
        .filter(task => task.pinColumnId === targetPinColumn.id && task.id !== activeId)
        .sort((a, b) => (a.position || 0) - (b.position || 0));
      
      const newPosition = columnTasks.length > 0 ? Math.max(...columnTasks.map(t => t.position || 0)) + 1 : 0;
      
      dispatch({
        type: 'UPDATE_TASK',
        payload: {
          ...activeTask,
          pinColumnId: targetPinColumn.id,
          pinned: true,
          position: newPosition,
          updatedAt: new Date().toISOString()
        }
      });
      return;
    }

    // Dropping on another task
    const overTask = state.tasks.find(t => t.id === overId);
    if (overTask && overTask.pinColumnId) {
      const targetColumnId = overTask.pinColumnId;
      const targetPosition = overTask.position || 0;
      
      const updatedTasks = state.tasks.map(task => {
        if (task.id === activeId) {
          return {
            ...task,
            pinColumnId: targetColumnId,
            pinned: true,
            position: targetPosition,
            updatedAt: new Date().toISOString()
          };
        } else if (task.pinColumnId === targetColumnId && task.id !== activeId) {
          if ((task.position || 0) >= targetPosition) {
            return {
              ...task,
              position: (task.position || 0) + 1,
              updatedAt: new Date().toISOString()
            };
          }
        }
        return task;
      });

      dispatch({
        type: 'SET_TASKS',
        payload: updatedTasks
      });
    }
  };

  // Task modal handlers
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };

  const handleCloseTaskModal = () => {
    setIsTaskModalOpen(false);
    setSelectedTask(null);
  };

  // Column management
  const handleStartEditColumn = (columnId: string, currentTitle: string) => {
    setEditingColumnId(columnId);
    setEditingColumnTitle(currentTitle);
  };

  const handleCancelEditColumn = () => {
    setEditingColumnId(null);
    setEditingColumnTitle('');
  };

  const handleSaveColumnTitle = (columnId: string, title: string) => {
    const column = state.pinColumns.find(col => col.id === columnId);
    if (column) {
      // If title is empty, use default "Neue Spalte" text
      const finalTitle = title.trim() || pins.newColumn();
      dispatch({
        type: 'UPDATE_PIN_COLUMN',
        payload: {
          ...column,
          title: finalTitle,
          updatedAt: new Date().toISOString()
        }
      });
    }
    setEditingColumnId(null);
    setEditingColumnTitle('');
  };

  const handleColumnTitleChange = (columnId: string, title: string) => {
    setEditingColumnTitle(title);
  };

  const handleDeleteColumn = (columnId: string) => {
    // Remove column
    dispatch({ type: 'DELETE_PIN_COLUMN', payload: columnId });
    
    // Unpin all tasks from this column
    const updatedTasks = state.tasks.map(task => {
      if (task.pinColumnId === columnId) {
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
  };

  const handleAddColumn = () => {
    const newColumn: PinColumnType = {
      id: `pin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: pins.newColumn(),
      color: state.preferences.accentColor,
      order: state.pinColumns.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    dispatch({ type: 'ADD_PIN_COLUMN', payload: newColumn });
    
    setTimeout(() => {
      // Start editing with empty string so user can type directly
      handleStartEditColumn(newColumn.id, '');
    }, 100);
  };

  const handleColumnManager = () => {
    setShowColumnManager(true);
  };

  // Column count handler
  const handleColumnCountChange = (count: number) => {
    dispatch({ 
      type: 'UPDATE_PREFERENCES', 
      payload: { 
        columns: { 
          ...state.preferences.columns, 
          pinsVisible: count 
        } 
      } 
    });
  };

  // Sortable pin column component
  const SortablePinColumn = ({ column, tasks }: { column: PinColumnType; tasks: Task[] }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: column.id,
      data: {
        type: 'pin-column',
      },
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    // Convert pin column to regular column format for TaskColumn
    const columnForTaskColumn = {
      id: column.id,
      title: column.title,
      color: column.color,
      position: column.order,
      createdAt: column.createdAt,
      updatedAt: column.updatedAt,
      projectId: 'pins',
      type: 'project' as const,
      order: column.order,
      tasks: []
    };

    return (
      <div 
        ref={setNodeRef} 
        style={style} 
        {...attributes}
        className="flex-1 min-w-0 transition-all duration-200"
      >
        <SortableContext
          items={tasks.map(task => task.id)}
          strategy={verticalListSortingStrategy}
        >
          <TaskColumn
            column={columnForTaskColumn}
            tasks={tasks}
            overId={overId}
            activeTask={activeTask}
            activeColumn={activeColumn}
            onSmartTaskAdd={undefined} // Disabled for pins
            showCompletedTasks={state.showCompletedTasks}
            isProjectColumn={false}
            isEditing={editingColumnId === column.id}
            editingTitle={editingColumnTitle}
            onStartEdit={handleStartEditColumn}
            onCancelEdit={handleCancelEditColumn}
            onSaveEdit={handleSaveColumnTitle}
            onTitleChange={handleColumnTitleChange}
            projectId={undefined}
            kanbanColumnId={column.id}
            dragListeners={listeners}
            isDragging={isDragging}
            onDeleteColumn={handleDeleteColumn}
            isPinColumn={true}
            onColumnManager={handleColumnManager}
          />
        </SortableContext>
      </div>
    );
  };

  // Render columns
  const renderColumns = (columns: (PinColumnType | null | undefined)[]) => {
    const result = [];
    const realColumnsCount = columns.filter(c => c && c !== null && c !== undefined).length;
    const isSingle = realColumnsCount === 1 && (state.preferences.columns.pinsVisible ?? state.preferences.columns.visible) === 1;
    
    for (let index = 0; index < columns.length; index++) {
      const column = columns[index];
      
      if (column === null) {
        // Add Column button
        result.push(
          <button
            key={`add-column-${index}`}
            onClick={() => handleAddColumn()}
            className={`flex flex-col items-center justify-center min-h-[120px] flex-1 min-w-0 rounded-lg transition-all duration-200 group ${
              isMinimalDesign
                ? 'bg-gray-50 hover:bg-gray-100 border-2 border-dashed border-gray-300 hover:border-gray-400'
                : 'bg-gray-100 bg-opacity-20 hover:bg-opacity-35 dark:bg-gray-700 dark:bg-opacity-20 dark:hover:bg-opacity-35 border border-dashed border-gray-300 border-opacity-40 dark:border-gray-600 dark:border-opacity-40'
            }`}
            title={pins.addNewColumn()}
          >
            <Plus className={`w-6 h-6 mb-1 transition-colors ${
              isMinimalDesign
                ? 'text-gray-600 group-hover:text-gray-800'
                : 'text-white group-hover:text-white'
            }`} />
            <span className={`text-xs font-medium transition-colors ${
              isMinimalDesign
                ? 'text-gray-600 group-hover:text-gray-800'
                : 'text-white group-hover:text-white'
            }`}>
              {pins.addColumn()}
            </span>
          </button>
        );
      } else if (column === undefined) {
        // Empty slot
        result.push(
          <div key={`empty-${index}`} className="flex-1 min-w-0">
            <div className="h-32"></div>
          </div>
        );
      } else {
        // Regular column
        const tasks = tasksByPinColumn[column.id] || [];
        const node = (
          <SortablePinColumn
            key={column.id}
            column={column}
            tasks={tasks}
          />
        );
        if (isSingle) {
          result.push(
            <div key={`single-wrap-${column.id}`} style={{ flex: '0 0 702px', maxWidth: 702, width: 702, margin: '0 auto' }}>
              {node}
            </div>
          );
        } else {
          result.push(node);
        }
      }
    }
    
    return result;
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className={`h-full w-full relative overflow-hidden ${
        isMinimalDesign ? 'bg-white dark:bg-[#111827]' : ''
      }`}>
        
        {/* Main Content Area */}
        <div className="h-full flex flex-col overflow-hidden">
          
          {/* Header */}
          <div className={`flex-shrink-0 px-4 py-3 ${
            isMinimalDesign
              ? 'bg-white dark:bg-[#111827] border-b border-gray-200 dark:border-gray-800'
              : 'bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: state.preferences.accentColor + '1A' }}>
                  <Pin className="w-5 h-5" style={{ color: state.preferences.accentColor }} />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {pins.title()}
                  </h1>
                  <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                    <span>{pins.tasksCount(Object.values(tasksByPinColumn).flat().length)}</span>
                    <span>•</span>
                    <span>{pins.columnsCount(state.pinColumns.length)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Board Content */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full flex flex-col relative px-4 pb-4">
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                height: 'auto', 
                gap: '12px',
                padding: '0',
                alignItems: 'stretch',
                width: '100%'
              }}>
                {displayColumns.length > 0 && (
                  <div 
                    ref={scrollContainerRef}
                    style={{ 
                      display: 'flex', 
                      gap: isMinimalDesign ? '5px' : '9px',
                      flex: 1,
                      alignItems: 'flex-start',
                      width: '100%',
                      marginTop: '10px',
                      overflowX: 'auto',
                      overflowY: 'hidden',
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#CBD5E1 #F1F5F9',
                      minWidth: 0,
                      position: 'relative',
                      outline: 'none'
                    }}
                  >
                    <SortableContext
                      items={displayColumns.filter((c): c is PinColumnType => !!c).map((c) => c.id)}
                      strategy={horizontalListSortingStrategy}
                    >
                      {renderColumns(displayColumns)}
                    </SortableContext>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Column Count Controls - Dynamically positioned */}
        {(() => {
          // PinsView uses the standard 80px sidebar
          const sidebarWidth = state.isNoteEditorFullScreen ? 0 : 80;
          const sidebarOffset = sidebarWidth / 2; // Half of sidebar width for centering
          
          return (
            <div 
              className="fixed bottom-4 z-30 transition-all duration-500 ease-in-out"
              style={{
                left: `calc(50% + ${sidebarOffset}px)`,
                transform: 'translateX(-50%)'
              }}
            >
              <div className="flex items-center bg-white dark:bg-gray-800 rounded-full px-2 py-1 shadow-lg border border-gray-200 dark:border-gray-700">
                {[1, 3, 5, 7].map((count) => (
                  <button
                    key={count}
                    onClick={() => handleColumnCountChange(count)}
                    className={`px-2 py-1 text-xs font-medium rounded-full transition-all duration-200 ${
                      (state.preferences.columns.pinsVisible ?? state.preferences.columns.visible) === count
                        ? 'text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    style={(state.preferences.columns.pinsVisible ?? state.preferences.columns.visible) === count ? { backgroundColor: state.preferences.accentColor } : {}}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ✨ Custom Drag Preview using Portal - Direct Mouse Tracking */}
        {activeTask && dragOffset && createPortal(
          <div
            style={{
              position: 'fixed',
              top: dragOffset.y - 40,
              left: dragOffset.x - 75,
              width: '320px',
              pointerEvents: 'none',
              zIndex: 9999,
              transform: 'rotate(3deg) scale(1.02)',
              filter: 'drop-shadow(0 12px 30px rgba(0,0,0,0.2))',
            }}
          >
            <TaskCard
              task={activeTask}
              isInDragOverlay={true}
            />
          </div>,
          document.body
        )}

        {/* Task Modal (rendered via portal to avoid container interference) */}
        {isTaskModalOpen && selectedTask && createPortal(
          <TaskModal
            // Always use freshest task instance from store (important during timer updates)
            task={state.tasks.find(t => t.id === selectedTask.id) || selectedTask}
            isOpen={isTaskModalOpen}
            onClose={handleCloseTaskModal}
          />,
          document.body
        )}

        {/* Pin Column Manager Modal */}
        <PinColumnManager
          isOpen={showColumnManager}
          onClose={() => setShowColumnManager(false)}
        />
      </div>
    </DndContext>
  );
} 