import React, { useState } from 'react';
import { Task, TodoistTask } from '../../types';
import { MaterialIcon } from './MaterialIcon';
import { useApp } from '../../context/AppContext';

interface ConflictData {
  taskId: string;
  title: string;
  conflictType: 'content' | 'deletion' | 'creation';
  localData: {
    task: Task;
    lastModified: string;
  };
  remoteData: {
    task: TodoistTask;
    lastModified: string;
  };
  resolution?: 'local' | 'remote' | 'merge' | 'skip';
}

interface ConflictResolutionModalProps {
  isOpen: boolean;
  conflicts: ConflictData[];
  onResolve: (resolutions: { [taskId: string]: 'local' | 'remote' | 'merge' | 'skip' }) => void;
  onCancel: () => void;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  isOpen,
  conflicts,
  onResolve,
  onCancel
}) => {
  const { state } = useApp();
  const [resolutions, setResolutions] = useState<{ [taskId: string]: 'local' | 'remote' | 'merge' | 'skip' }>({});
  const [currentConflictIndex, setCurrentConflictIndex] = useState(0);

  if (!isOpen || conflicts.length === 0) {
    return null;
  }

  const currentConflict = conflicts[currentConflictIndex];
  const localTask = currentConflict.localData.task;
  const remoteTask = currentConflict.remoteData.task;

  const handleResolutionChange = (taskId: string, resolution: 'local' | 'remote' | 'merge' | 'skip') => {
    setResolutions(prev => ({
      ...prev,
      [taskId]: resolution
    }));
  };

  const handleNext = () => {
    if (currentConflictIndex < conflicts.length - 1) {
      setCurrentConflictIndex(currentConflictIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentConflictIndex > 0) {
      setCurrentConflictIndex(currentConflictIndex - 1);
    }
  };

  const handleFinish = () => {
    // Set default resolution for unresolved conflicts
    const finalResolutions = { ...resolutions };
    conflicts.forEach(conflict => {
      if (!finalResolutions[conflict.taskId]) {
        finalResolutions[conflict.taskId] = 'skip'; // Default to skip
      }
    });
    onResolve(finalResolutions);
  };

  const currentResolution = resolutions[currentConflict.taskId];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('de-DE');
  };

  const getFieldValue = (task: Task | TodoistTask, field: string): string => {
    if ('content' in task) {
      // Todoist task
      const todoistTask = task as TodoistTask;
      switch (field) {
        case 'title': return todoistTask.content;
        case 'description': return todoistTask.description || '';
        case 'dueDate': return todoistTask.due?.date || '';
        case 'completed': return todoistTask.is_completed ? 'Ja' : 'Nein';
        case 'priority': return `${todoistTask.priority || 1}`;
        case 'tags': return (todoistTask.labels || []).join(', ');
        default: return '';
      }
    } else {
      // TaskFuchs task
      const taskFuchsTask = task as Task;
      switch (field) {
        case 'title': return taskFuchsTask.title;
        case 'description': return taskFuchsTask.description || '';
        case 'dueDate': return taskFuchsTask.dueDate || '';
        case 'deadline': return taskFuchsTask.deadline || '';
        case 'completed': return taskFuchsTask.completed ? 'Ja' : 'Nein';
        case 'priority': return `${taskFuchsTask.priority || 1}`;
        case 'tags': return (taskFuchsTask.tags || []).join(', ');
        default: return '';
      }
    }
  };

  const getFieldDifferences = () => {
    const fields = ['title', 'description', 'dueDate', 'deadline', 'completed', 'priority', 'tags'];
    const differences: { field: string; local: string; remote: string; isDifferent: boolean }[] = [];

    fields.forEach(field => {
      const localValue = getFieldValue(localTask, field);
      const remoteValue = getFieldValue(remoteTask, field);
      
      // Skip deadline for Todoist tasks since they don't have it
      if (field === 'deadline' && 'content' in remoteTask) {
        return;
      }

      differences.push({
        field,
        local: localValue,
        remote: remoteValue,
        isDifferent: localValue !== remoteValue
      });
    });

    return differences;
  };

  const fieldDifferences = getFieldDifferences();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700"
             style={{ borderColor: `${state.preferences.accentColor}40` }}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                 style={{ backgroundColor: `${state.preferences.accentColor}20` }}>
              <MaterialIcon name="merge" className="w-6 h-6" style={{ color: state.preferences.accentColor }} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Sync-Konflikt auflösen
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Aufgabe wurde in beiden Apps geändert ({currentConflictIndex + 1} von {conflicts.length})
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <MaterialIcon name="close" className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Task Title */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Konflikt bei Aufgabe: "{currentConflict.title}"
            </h3>
            <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-1">
                <MaterialIcon name="schedule" className="w-4 h-4" />
                <span>TaskFuchs: {formatDate(currentConflict.localData.lastModified)}</span>
              </div>
              <div className="flex items-center space-x-1">
                <MaterialIcon name="schedule" className="w-4 h-4" />
                <span>Todoist: {formatDate(currentConflict.remoteData.lastModified)}</span>
              </div>
            </div>
          </div>

          {/* Resolution Options */}
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
              Wie möchten Sie diesen Konflikt auflösen?
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { value: 'local', label: 'TaskFuchs verwenden', icon: 'home', description: 'Lokale Änderungen beibehalten' },
                { value: 'remote', label: 'Todoist verwenden', icon: 'cloud', description: 'Remote-Änderungen übernehmen' },
                { value: 'merge', label: 'Manuell zusammenführen', icon: 'merge', description: 'Kombiniere beide Versionen' },
                { value: 'skip', label: 'Überspringen', icon: 'skip_next', description: 'Diesen Konflikt ignorieren' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleResolutionChange(currentConflict.taskId, option.value as any)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    currentResolution === option.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                  style={{
                    borderColor: currentResolution === option.value ? state.preferences.accentColor : undefined,
                    backgroundColor: currentResolution === option.value ? `${state.preferences.accentColor}15` : undefined
                  }}
                >
                                     <div className="flex items-center space-x-2 mb-2">
                     <MaterialIcon name={option.icon} className="w-5 h-5" 
                                   style={{ color: currentResolution === option.value ? state.preferences.accentColor : undefined }} />
                     <span className="font-medium text-gray-900 dark:text-white">{option.label}</span>
                   </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{option.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Field Comparison */}
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
              Unterschiede im Detail
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-200 dark:border-gray-700 rounded-lg">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Feld</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">TaskFuchs</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Todoist</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {fieldDifferences.map((diff, index) => (
                    <tr key={diff.field} className={diff.isDifferent ? 'bg-red-50 dark:bg-red-900/20' : ''}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        <div className="flex items-center space-x-2">
                          <span className="capitalize">{
                            diff.field === 'dueDate' ? 'Fälligkeitsdatum' :
                            diff.field === 'deadline' ? 'Deadline' :
                            diff.field === 'completed' ? 'Abgeschlossen' :
                            diff.field === 'priority' ? 'Priorität' :
                            diff.field === 'tags' ? 'Tags' :
                            diff.field === 'description' ? 'Beschreibung' :
                            'Titel'
                          }</span>
                                                     {diff.isDifferent && <MaterialIcon name="warning" className="w-4 h-4 text-red-500" />}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        <div className="max-w-xs truncate">{diff.local || '-'}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        <div className="max-w-xs truncate">{diff.remote || '-'}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrevious}
              disabled={currentConflictIndex === 0}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                             <MaterialIcon name="chevron_left" className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {currentConflictIndex + 1} von {conflicts.length}
            </span>
            <button
              onClick={handleNext}
              disabled={currentConflictIndex === conflicts.length - 1}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                             <MaterialIcon name="chevron_right" className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Abbrechen
            </button>
            <button
              onClick={handleFinish}
              className="px-6 py-2 rounded-lg text-white font-medium transition-colors"
              style={{ backgroundColor: state.preferences.accentColor }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = `${state.preferences.accentColor}dd`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = state.preferences.accentColor;
              }}
            >
              {Object.keys(resolutions).length < conflicts.length ? 'Übrige überspringen' : 'Auflösen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 