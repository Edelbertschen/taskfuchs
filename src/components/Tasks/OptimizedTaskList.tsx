import React, { memo, useCallback, useMemo } from 'react';
import { useOptimizedList } from '../../hooks/useOptimizedList';
import { VirtualizedList } from '../Common/VirtualizedList';
import { TaskCard } from './TaskCard';
import { LoadingSpinner } from '../Common/LoadingSpinner';
import { useApp } from '../../context/AppContext';
import type { Task } from '../../types';

interface OptimizedTaskListProps {
  tasks: Task[];
  searchQuery?: string;
  sortBy?: 'title' | 'dueDate' | 'priority' | 'created';
  sortOrder?: 'asc' | 'desc';
  onTaskEdit?: (task: Task) => void;
  onTaskToggle?: (taskId: string) => void;
  onTaskPlay?: (task: Task) => void;
  enableVirtualization?: boolean;
  itemHeight?: number;
  containerHeight?: number;
}

const OptimizedTaskList = memo(function OptimizedTaskList({
  tasks,
  searchQuery = '',
  sortBy = 'created',
  sortOrder = 'desc',
  onTaskEdit,
  onTaskToggle,
  onTaskPlay,
  enableVirtualization = true,
  itemHeight = 80,
  containerHeight = 600
}: OptimizedTaskListProps) {
  const { state } = useApp();

  // Filter function for search
  const filterFn = useCallback((task: Task, query: string) => {
    const searchTerm = query.toLowerCase();
    return (
      task.title.toLowerCase().includes(searchTerm) ||
      task.description?.toLowerCase().includes(searchTerm) ||
      task.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
      task.subtasks.some(subtask => 
        subtask.title.toLowerCase().includes(searchTerm) ||
        subtask.description?.toLowerCase().includes(searchTerm)
      )
    );
  }, []);

  // Sort function
  const sortFn = useCallback((a: Task, b: Task) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'dueDate':
        const aDate = a.dueDate ? new Date(a.dueDate).getTime() : 0;
        const bDate = b.dueDate ? new Date(b.dueDate).getTime() : 0;
        comparison = aDate - bDate;
        break;
      case 'priority':
        const priorityOrder = { high: 3, medium: 2, low: 1, none: 0 };
        const aPriority = priorityOrder[a.priority || 'none'];
        const bPriority = priorityOrder[b.priority || 'none'];
        comparison = bPriority - aPriority; // High priority first
        break;
      case 'created':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      default:
        comparison = 0;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  }, [sortBy, sortOrder]);

  // Use optimized list hook
  const {
    items: optimizedTasks,
    totalItems,
    isLoading,
    hasMore,
    loadMore,
    virtualizedProps
  } = useOptimizedList({
    items: tasks,
    filterFn,
    sortFn,
    searchQuery,
    pageSize: 50,
    enableVirtualization,
    itemHeight
  });

  // Render item function for virtualized list
  const renderTaskItem = useCallback((task: Task, index: number) => {
    return (
      <TaskCard
        key={task.id}
        task={task}
        isDragging={false}
        isNewTask={false}
        isFirst={index === 0}
        isLast={index === optimizedTasks.length - 1}
      />
    );
  }, [optimizedTasks.length]);

  // Memoized empty state
  const emptyState = useMemo(() => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
        <span className="text-2xl">📝</span>
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        {searchQuery ? 'Keine Aufgaben gefunden' : 'Keine Aufgaben vorhanden'}
      </h3>
      <p className="text-gray-500 dark:text-gray-400">
        {searchQuery 
          ? `Keine Aufgaben entsprechen "${searchQuery}"`
          : 'Erstelle deine erste Aufgabe um loszulegen'
        }
      </p>
    </div>
  ), [searchQuery]);

  if (isLoading && optimizedTasks.length === 0) {
    return <LoadingSpinner message="Lade Aufgaben..." />;
  }

  if (optimizedTasks.length === 0) {
    return emptyState;
  }

  // Use virtualization for large lists
  if (enableVirtualization && virtualizedProps && optimizedTasks.length > 100) {
    return (
      <div className="h-full">
        <VirtualizedList
          items={optimizedTasks}
          itemHeight={itemHeight}
          containerHeight={containerHeight}
          renderItem={renderTaskItem}
          overscan={5}
          isLoading={isLoading}
          hasMore={hasMore}
          onLoadMore={loadMore}
          emptyMessage="Keine Aufgaben vorhanden"
        />
        
        {/* Task count indicator */}
        <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
          {optimizedTasks.length} von {totalItems} Aufgaben angezeigt
        </div>
      </div>
    );
  }

  // Regular rendering for smaller lists
  return (
    <div className="space-y-2">
      {optimizedTasks.map((task, index) => renderTaskItem(task, index))}
      
      {hasMore && (
        <div className="flex justify-center py-4">
          <button
            onClick={loadMore}
            disabled={isLoading}
            className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            style={{ 
              backgroundColor: isLoading ? undefined : state.preferences.accentColor + '20',
              borderColor: state.preferences.accentColor + '40'
            }}
          >
            {isLoading ? 'Lädt...' : 'Mehr laden'}
          </button>
        </div>
      )}
      
      {/* Task count indicator */}
      <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 text-center border-t border-gray-200 dark:border-gray-700">
        {optimizedTasks.length} von {totalItems} Aufgaben
      </div>
    </div>
  );
});

export { OptimizedTaskList }; 