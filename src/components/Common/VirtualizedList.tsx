import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  onScroll?: (scrollTop: number) => void;
  overscan?: number;
  className?: string;
  emptyMessage?: string;
  loadingIndicator?: React.ReactNode;
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  threshold?: number;
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  onScroll,
  overscan = 5,
  className = '',
  emptyMessage = 'Keine Elemente vorhanden',
  loadingIndicator = <div className="p-4 text-center text-gray-500">Lädt...</div>,
  isLoading = false,
  onLoadMore,
  hasMore = false,
  threshold = 200
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);
  const scrollTimer = useRef<NodeJS.Timeout>();

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.min(
      start + Math.ceil(containerHeight / itemHeight),
      items.length
    );
    
    return {
      start: Math.max(0, start - overscan),
      end: Math.min(items.length, end + overscan)
    };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      item,
      index: visibleRange.start + index
    }));
  }, [items, visibleRange.start, visibleRange.end]);

  const totalHeight = items.length * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);

    isScrolling.current = true;
    
    // Clear existing timer
    if (scrollTimer.current) {
      clearTimeout(scrollTimer.current);
    }
    
    // Set timer to detect end of scrolling
    scrollTimer.current = setTimeout(() => {
      isScrolling.current = false;
    }, 150);

    // Check if we need to load more data
    if (onLoadMore && hasMore && !isLoading) {
      const scrollHeight = e.currentTarget.scrollHeight;
      const clientHeight = e.currentTarget.clientHeight;
      const scrollPosition = newScrollTop + clientHeight;
      
      if (scrollHeight - scrollPosition < threshold) {
        onLoadMore();
      }
    }
  }, [onScroll, onLoadMore, hasMore, isLoading, threshold]);

  useEffect(() => {
    return () => {
      if (scrollTimer.current) {
        clearTimeout(scrollTimer.current);
      }
    };
  }, []);

  if (items.length === 0 && !isLoading) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center">
          <div className="text-gray-400 mb-2">
            <svg
              className="w-12 h-12 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <p className="text-gray-500">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index }) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top: index * itemHeight,
              left: 0,
              right: 0,
              height: itemHeight
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
        
        {isLoading && (
          <div
            style={{
              position: 'absolute',
              top: items.length * itemHeight,
              left: 0,
              right: 0
            }}
          >
            {loadingIndicator}
          </div>
        )}
      </div>
    </div>
  );
}

// Performance-optimized component for task lists
export const TaskListItem = React.memo(({ 
  task, 
  onToggle, 
  onEdit, 
  onDelete,
  isSelected,
  onClick 
}: {
  task: any;
  onToggle: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  isSelected: boolean;
  onClick: (id: string) => void;
}) => {
  const handleToggle = useCallback(() => onToggle(task.id), [task.id, onToggle]);
  const handleEdit = useCallback(() => onEdit(task.id), [task.id, onEdit]);
  const handleDelete = useCallback(() => onDelete(task.id), [task.id, onDelete]);
  const handleClick = useCallback(() => onClick(task.id), [task.id, onClick]);

  return (
    <div
      className={`p-3 border-b border-gray-200 dark:border-gray-700 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
        isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
      }`}
      onClick={handleClick}
    >
      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={handleToggle}
          className="rounded border-gray-300 dark:border-gray-600"
          onClick={(e) => e.stopPropagation()}
        />
        <div className="flex-1">
          <div className={`font-medium ${task.completed ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'}`}>
            {task.title}
          </div>
          {task.description && (
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {task.description}
            </div>
          )}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEdit();
            }}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            Bearbeiten
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            className="text-red-600 hover:text-red-800 text-sm"
          >
            Löschen
          </button>
        </div>
      </div>
    </div>
  );
});

TaskListItem.displayName = 'TaskListItem'; 