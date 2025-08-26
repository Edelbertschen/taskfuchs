import { useApp } from '../../context/AppContext';
import type { KanbanGroupingMode } from '../../types';
import { BarChart3, Calendar, Tag, User, Folder, Clock } from 'lucide-react';

export function GroupingSelector() {
  const { state, dispatch } = useApp();
  const { viewState } = state;

  const groupingOptions: { 
    mode: KanbanGroupingMode; 
    label: string; 
    icon: React.ComponentType<any>;
    description: string;
  }[] = [
    {
      mode: 'status',
      label: 'Status',
      icon: BarChart3,
      description: 'Zu erledigen / Erledigt'
    },
    {
      mode: 'priority',
      label: 'Priorität',
      icon: User,
      description: 'Hoch / Mittel / Niedrig'
    },
    {
      mode: 'date',
      label: 'Datum',
      icon: Calendar,
      description: 'Geplant / Ungeplant / Überfällig'
    },
    {
      mode: 'tags',
      label: 'Tags',
      icon: Tag,
      description: 'Nach Tags gruppiert'
    },
    {
      mode: 'projects',
      label: 'Projekte',
      icon: Folder,
      description: 'Nach Projekt-Spalten'
    },
    {
      mode: 'deadlines',
      label: 'Deadlines',
      icon: Clock,
      description: 'Heute / Morgen / Diese Woche'
    },
  ];

  const handleGroupingChange = (mode: KanbanGroupingMode) => {
    dispatch({ type: 'SET_KANBAN_GROUPING', payload: mode });
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">
        Gruppierung:
      </span>
      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {groupingOptions.map((option) => {
          const Icon = option.icon;
          const isActive = viewState.kanbanGrouping === option.mode;
          
          return (
            <button
              key={option.mode}
              onClick={() => handleGroupingChange(option.mode)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              title={option.description}
            >
              <Icon className="w-4 h-4" />
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
} 