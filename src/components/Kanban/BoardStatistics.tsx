import { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import type { Task, KanbanBoard, KanbanGroupingMode } from '../../types';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  PieChart,
  Activity,
  Target,
  Users
} from 'lucide-react';
import { format, subDays } from 'date-fns';

interface BoardStatisticsProps {
  board?: KanbanBoard;
  tasks: Task[];
  className?: string;
}

interface BoardMetrics {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  overdueTasks: number;
  todayTasks: number;
  averageCompletionTime: number;
  tasksPerColumn: Record<string, number>;
  tasksPerPriority: Record<string, number>;
  tasksPerTag: Record<string, number>;
  weeklyTrend: { date: string; completed: number; created: number }[];
  workloadDistribution: { column: string; count: number; percentage: number }[];
}

export function BoardStatistics({ board, tasks, className = '' }: BoardStatisticsProps) {
  const { state } = useApp();

  // Calculate comprehensive board metrics
  const metrics = useMemo((): BoardMetrics => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // Filter tasks based on board configuration if provided
    const filteredTasks = board ? tasks : tasks;
    
    // Basic counts
    const totalTasks = filteredTasks.length;
    const completedTasks = filteredTasks.filter(task => task.completed).length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    // Overdue and today's tasks
    const overdueTasks = filteredTasks.filter(task => 
      task.reminderDate && task.reminderDate < todayStr && !task.completed
    ).length;
    
    const todayTasks = filteredTasks.filter(task => 
      task.reminderDate === todayStr
    ).length;

    // Average completion time calculation (simplified)
    const completedTasksWithDates = filteredTasks.filter(task => 
      task.completed && task.createdAt && task.updatedAt
    );
    
    const averageCompletionTime = completedTasksWithDates.length > 0 
      ? completedTasksWithDates.reduce((avg, task) => {
          const created = new Date(task.createdAt).getTime();
          const updated = new Date(task.updatedAt).getTime();
          return avg + (updated - created);
        }, 0) / completedTasksWithDates.length / (1000 * 60 * 60 * 24) // Convert to days
      : 0;

    // Tasks per column distribution
    const tasksPerColumn: Record<string, number> = {};
    if (board && board.groupingMode !== 'custom') {
      // Group tasks according to board's grouping mode
      filteredTasks.forEach(task => {
        let columnKey = '';
        
        switch (board.groupingMode) {
          case 'status':
            columnKey = task.completed ? 'done' : 'todo';
            break;
          case 'priority':
            columnKey = task.priority;
            break;
          case 'projects':
            columnKey = task.columnId;
            break;
          case 'tags':
            if (task.tags.length > 0) {
              task.tags.forEach(tag => {
                tasksPerColumn[tag] = (tasksPerColumn[tag] || 0) + 1;
              });
              return;
            } else {
              columnKey = 'untagged';
            }
            break;
          case 'deadlines':
            if (!task.dueDate) {
              columnKey = 'no_deadline';
            } else if (task.dueDate < todayStr && !task.completed) {
              columnKey = 'overdue';
            } else if (task.dueDate === todayStr) {
              columnKey = 'today';
            } else {
              columnKey = 'later';
            }
            break;
          default:
            columnKey = 'all';
        }
        
        if (columnKey) {
          tasksPerColumn[columnKey] = (tasksPerColumn[columnKey] || 0) + 1;
        }
      });
    }

    // Tasks per priority
    const tasksPerPriority = filteredTasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Tasks per tag
    const tasksPerTag = filteredTasks.reduce((acc, task) => {
      task.tags.forEach(tag => {
        acc[tag] = (acc[tag] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    // Weekly trend (last 7 days)
    const weeklyTrend = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(now, 6 - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const completed = filteredTasks.filter(task => 
        task.completed && task.updatedAt.startsWith(dateStr)
      ).length;
      
      const created = filteredTasks.filter(task => 
        task.createdAt.startsWith(dateStr)
      ).length;
      
      return {
        date: format(date, 'dd.MM.'),
        completed,
        created
      };
    });

    // Workload distribution
    const workloadDistribution = Object.entries(tasksPerColumn).map(([column, count]) => ({
      column,
      count,
      percentage: totalTasks > 0 ? (count / totalTasks) * 100 : 0
    })).sort((a, b) => b.count - a.count);

    return {
      totalTasks,
      completedTasks,
      completionRate,
      overdueTasks,
      todayTasks,
      averageCompletionTime,
      tasksPerColumn,
      tasksPerPriority,
      tasksPerTag,
      weeklyTrend,
      workloadDistribution
    };
  }, [tasks, board]);

  const getColumnDisplayName = (columnKey: string, groupingMode?: KanbanGroupingMode) => {
    if (!groupingMode) return columnKey;
    
    switch (groupingMode) {
      case 'status':
        return columnKey === 'todo' ? 'Zu erledigen' : 'Erledigt';
      case 'priority':
        return columnKey === 'high' ? 'Hoch' : 
               columnKey === 'medium' ? 'Mittel' : 'Niedrig';
      case 'deadlines':
        return columnKey === 'overdue' ? 'Überfällig' :
               columnKey === 'today' ? 'Heute' :
               columnKey === 'no_deadline' ? 'Kein Termin' : 'Später';
      case 'projects':
        const column = state.columns.find(col => col.id === columnKey);
        return column ? column.title : columnKey;
      default:
        return columnKey;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
      case 'low': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Board-Statistiken
          {board && <span className="text-sm font-normal text-gray-500">• {board.name}</span>}
        </h3>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Gesamt</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.totalTasks}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Erledigt</p>
              <p className="text-2xl font-bold text-green-600">{metrics.completedTasks}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Erfolgsrate</p>
              <p className="text-2xl font-bold text-blue-600">{metrics.completionRate.toFixed(1)}%</p>
            </div>
            <Target className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Überfällig</p>
              <p className="text-2xl font-bold text-red-600">{metrics.overdueTasks}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Charts and Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <PieChart className="w-4 h-4" />
            Aufgabenverteilung
          </h4>
          <div className="space-y-3">
            {metrics.workloadDistribution.slice(0, 5).map(({ column, count, percentage }) => (
              <div key={column} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {getColumnDisplayName(column, board?.groupingMode)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{count}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">({percentage.toFixed(1)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Prioritätsverteilung
          </h4>
          <div className="space-y-3">
            {Object.entries(metrics.tasksPerPriority).map(([priority, count]) => (
              <div key={priority} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(priority)}`}>
                    {priority === 'high' ? 'Hoch' : priority === 'medium' ? 'Mittel' : 'Niedrig'}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Trend */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 lg:col-span-2">
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            7-Tage-Trend
          </h4>
          <div className="flex items-end justify-between h-32 space-x-2">
            {metrics.weeklyTrend.map((day, index) => (
              <div key={index} className="flex flex-col items-center space-y-2 flex-1">
                <div className="w-full flex flex-col space-y-1">
                  <div 
                    className="bg-green-500 rounded-t"
                    style={{ 
                      height: `${Math.max(4, (day.completed / Math.max(...metrics.weeklyTrend.map(d => d.completed)) * 80))}px` 
                    }}
                    title={`${day.completed} erledigt`}
                  />
                  <div 
                    className="bg-blue-500 rounded-b"
                    style={{ 
                      height: `${Math.max(4, (day.created / Math.max(...metrics.weeklyTrend.map(d => d.created)) * 80))}px` 
                    }}
                    title={`${day.created} erstellt`}
                  />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">{day.date}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center mt-4 space-x-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">Erledigt</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">Erstellt</span>
            </div>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 lg:col-span-2">
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Weitere Metriken
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{metrics.todayTasks}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Heute fällig</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{metrics.averageCompletionTime.toFixed(1)}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">⌀ Bearbeitungszeit (Tage)</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{Object.keys(metrics.tasksPerTag).length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Aktive Tags</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {metrics.totalTasks > 0 ? (metrics.totalTasks - metrics.completedTasks) : 0}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Offene Aufgaben</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 