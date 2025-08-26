import React, { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useTranslation } from 'react-i18next';
import type { Task, KanbanGroupingMode } from '../../types';
import { KanbanCard } from './KanbanCard';
import type { LucideIcon } from 'lucide-react';

interface KanbanColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  color: string;
  icon: LucideIcon;
  groupingMode: KanbanGroupingMode;
  isOver?: boolean;
}

export const KanbanColumn = React.memo(function KanbanColumn({
  id,
  title,
  tasks,
  color,
  icon: Icon,
  groupingMode,
  isOver = false,
}: KanbanColumnProps) {
  const { t } = useTranslation();
  const { setNodeRef } = useDroppable({
    id: `kanban-column-${id}`,
  });

  // Memoize task completion stats
  const taskStats = useMemo(() => {
    const completedCount = tasks.filter(task => task.completed).length;
    return { completedCount, totalCount: tasks.length };
  }, [tasks]);

  // Memoize empty state message
  const emptyStateMessage = useMemo(() => {
    return getEmptyStateMessage(groupingMode, id, t);
  }, [groupingMode, id, t]);

  return (
    <div className="flex flex-col w-80 h-full">
      {/* Column Header */}
      <div className={`flex items-center gap-3 p-4 rounded-t-lg border-2 ${color}`}>
        <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          {tasks.length > 0 && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {taskStats.completedCount}/{taskStats.totalCount} {t('common.completed')}
            </div>
          )}
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 px-2 py-1 rounded-full">
          {tasks.length}
        </span>
      </div>

      {/* Column Content */}
      <div
        ref={setNodeRef}
        className={`flex-1 p-0 space-y-3 border-l-2 border-r-2 border-b-2 rounded-b-lg bg-white dark:bg-gray-800 transition-colors ${
          color.replace('bg-', 'border-')
        } ${isOver ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
      >
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400 dark:text-gray-500 text-sm">
            <Icon className="w-8 h-8 mb-2 opacity-50" />
            <span>Keine Aufgaben</span>
            <span className="text-xs mt-1 opacity-75">
              {emptyStateMessage}
            </span>
          </div>
        ) : (
          tasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              groupingMode={groupingMode}
            />
          ))
        )}
      </div>
    </div>
  );
});

function getEmptyStateMessage(groupingMode: KanbanGroupingMode, columnId: string, t: any): string {
  switch (groupingMode) {
    case 'status':
      return columnId === 'todo' ? t('kanban.empty_states.all_tasks_completed') : t('kanban.empty_states.no_completed_tasks');
    case 'priority':
      if (columnId === 'high') return t('kanban.empty_states.no_high_priority_tasks');
      if (columnId === 'medium') return t('kanban.empty_states.no_medium_priority_tasks');
      if (columnId === 'low') return t('kanban.empty_states.no_low_priority_tasks');
      return t('kanban.empty_states.no_priority_tasks');
    case 'deadlines':
      if (columnId === 'overdue') return t('kanban.empty_states.no_overdue_tasks');
      if (columnId.startsWith('date-')) {
        const today = new Date().toISOString().split('T')[0]; // Format: yyyy-mm-dd
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const columnDate = columnId.replace('date-', '');
        
        if (columnDate === today) return t('kanban.empty_states.today_is_free');
        if (columnDate === tomorrow) return t('kanban.empty_states.tomorrow_is_free');
        return t('kanban.empty_states.nothing_planned_for_day');
      }
      return t('kanban.empty_states.no_tasks_in_timeframe');
    case 'projects':
      return t('kanban.empty_states.project_is_empty');
    case 'tags':
      return columnId === 'untagged' ? t('kanban.empty_states.all_tasks_tagged') : t('kanban.empty_states.no_tasks_with_tag');
    default:
      return t('kanban.empty_states.drag_tasks_here');
  }
} 