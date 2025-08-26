import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useAppTranslation } from '../../utils/i18nHelpers';
import { RefreshCw, Plus, Edit2, Trash2, Calendar, BarChart3, Tag as TagIcon } from 'lucide-react';
import { DeleteConfirmationModal } from '../Common/DeleteConfirmationModal';
import { SeriesDeleteModal } from '../Common/SeriesDeleteModal';
import { TaskModal } from '../Tasks/TaskModal';

export const SeriesView: React.FC = () => {
  const { state, dispatch } = useApp();
  const { series } = useAppTranslation();
  const isMinimalDesign = state.preferences.minimalDesign;
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSeriesDeleteModal, setShowSeriesDeleteModal] = useState(false);
  const [deletingSeries, setDeletingSeries] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);

  // Get all recurring tasks with statistics
  const recurringTasks = useMemo(() => {
    return state.tasks.filter(task => 
      task.recurring?.enabled && !task.parentSeriesId
    );
  }, [state.tasks]);

  const formatRecurrencePattern = (recurring: any) => {
    if (!recurring) return '';
    
    const types: Record<string, string> = {
      daily: series.recurrenceTypes.daily(),
      weekly: series.recurrenceTypes.weekly(), 
      monthly: series.recurrenceTypes.monthly(),
      yearly: series.recurrenceTypes.yearly()
    };
    
    const interval = recurring.interval > 1 ? ` alle ${recurring.interval}` : '';
    return `${types[recurring.type] || recurring.type}${interval}`;
  };

  const getNextInstanceDate = (task: any) => {
    if (!task.recurring?.enabled) return null;
    
    // Use dueDate if available, otherwise use reminderDate
    const baseDateString = task.dueDate || task.reminderDate;
    if (!baseDateString) return null;
    
    const baseDate = new Date(baseDateString);
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Reset time for date comparison
    
    let nextDate = new Date(baseDate);
    nextDate.setHours(0, 0, 0, 0); // Reset time for date comparison
    
    // If base date is in the future, return it
    if (nextDate > now) {
      return nextDate;
    }
    
    // Otherwise, calculate the next occurrence
    const interval = task.recurring.interval || 1;
    
    while (nextDate <= now) {
      switch (task.recurring.type) {
        case 'daily':
          nextDate.setDate(nextDate.getDate() + interval);
          break;
        case 'weekly':
          nextDate.setDate(nextDate.getDate() + (7 * interval));
          break;
        case 'monthly':
          nextDate.setMonth(nextDate.getMonth() + interval);
          break;
        case 'yearly':
          nextDate.setFullYear(nextDate.getFullYear() + interval);
          break;
      }
    }
    
    return nextDate;
  };

  const findOrCreateNextInstance = (seriesTask: any) => {
    const nextInstanceDate = getNextInstanceDate(seriesTask);
    if (!nextInstanceDate) return null;

    // Check if an instance for this date already exists
    const existingInstance = state.tasks.find(task => 
      task.parentSeriesId === seriesTask.id && 
      task.dueDate && 
      new Date(task.dueDate).toDateString() === nextInstanceDate.toDateString()
    );

    if (existingInstance) {
      return existingInstance;
    }

    // Create a new instance for the next date
    const newInstance = {
      ...seriesTask,
      id: `${seriesTask.id}_${nextInstanceDate.toISOString().split('T')[0]}`,
      parentSeriesId: seriesTask.id,
      isSeriesTemplate: false,
      dueDate: nextInstanceDate.toISOString().split('T')[0],
      reminderDate: nextInstanceDate.toISOString().split('T')[0],
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return newInstance;
  };

  const handleEditSeries = (task: any) => {
    const nextInstance = findOrCreateNextInstance(task);
    if (nextInstance) {
      setEditingTask(nextInstance);
      setShowTaskModal(true);
    }
  };

  const handleDeleteSeries = (task: any) => {
    setDeletingSeries(task.id);
    setShowSeriesDeleteModal(true);
  };

  const confirmDeleteSeries = () => {
    if (deletingSeries) {
      // Find the series task to get its recurrenceRuleId
      const seriesTask = state.tasks.find(t => t.id === deletingSeries);
      
      // Find all instances of this series in all locations (Planer, Projects, etc.)
      const instancesToDelete = state.tasks.filter(t => {
        // Direct instances with parentSeriesId
        if (t.parentSeriesId === deletingSeries) return true;
        
        // Legacy instances with same recurrenceRuleId (excluding the series template itself)
        if (seriesTask?.recurrenceRuleId && t.recurrenceRuleId === seriesTask.recurrenceRuleId && t.id !== deletingSeries) {
          return true;
        }
        
        return false;
      });
      
      // Delete all instances first
      instancesToDelete.forEach(instance => {
        dispatch({ type: 'DELETE_TASK', payload: instance.id });
      });
      
      // Then delete the series template
      dispatch({ type: 'DELETE_TASK', payload: deletingSeries });
      
      setShowDeleteModal(false);
      setDeletingSeries(null);
    }
  };

  const handleDeleteInstance = () => {
    // This shouldn't happen in SeriesView, but handle gracefully
    if (deletingSeries) {
      dispatch({ type: 'DELETE_TASK', payload: deletingSeries });
    }
    setShowSeriesDeleteModal(false);
    setDeletingSeries(null);
  };

  const handleDeleteEntireSeries = () => {
    confirmDeleteSeries();
    setShowSeriesDeleteModal(false);
  };

  return (
    <div className={`flex-1 p-6 min-h-screen ${
      isMinimalDesign 
        ? 'bg-white dark:bg-gray-900' 
        : 'bg-white'
    }`}>
      <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <RefreshCw 
            className="w-8 h-8" 
            style={{ color: state.preferences.accentColor }}
          />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {series.title()}
          </h1>
        </div>
        
        <button
          onClick={() => {
            // Navigate to planner and create a new task (user can then add recurrence)
            alert(series.createSeriesInstruction());
          }}
          className="flex items-center space-x-2 px-4 py-2 text-white rounded-lg transition-colors"
          style={{ backgroundColor: state.preferences.accentColor }}
        >
          <Plus className="w-4 h-4" />
          <span>{series.newSeries()}</span>
        </button>
      </div>

      {/* Series List */}
      <div className="space-y-6">
        <div className="bg-white">
          {recurringTasks.length === 0 ? (
            <div className="text-center py-12">
              <RefreshCw className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {series.noRecurringSeries()}
              </h3>
              <p className="text-gray-500 mb-6">
                {series.createRecurringTasksInstruction()}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recurringTasks.map((task) => {
                const nextInstance = getNextInstanceDate(task);
                // Count instances: either by parentSeriesId or by same recurrenceRuleId
                const instanceCount = state.tasks.filter(t => 
                  t.parentSeriesId === task.id || 
                  (t.recurrenceRuleId === task.recurrenceRuleId && t.id !== task.id)
                ).length;
                
                return (
                  <div
                    key={task.id}
                    className="group relative border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-md transition-all duration-200 bg-white"
                  >
                    {/* Priority indicator line */}
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
                      style={{ 
                        backgroundColor: task.priority === 'high' ? '#ef4444' :
                                       task.priority === 'medium' ? '#f59e0b' :
                                       task.priority === 'low' ? '#10b981' : '#6b7280'
                      }}
                    />
                    
                    <div className="pl-4 pr-4 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-medium text-gray-900 dark:text-white truncate">{task.title}</h3>
                            <div className="flex items-center space-x-1">
                              <RefreshCw className="w-3 h-3 text-gray-400" />
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>{formatRecurrencePattern(task.recurring)}</span>
                            {nextInstance && (
                              <span className="flex items-center space-x-1">
                                <Calendar className="w-3 h-3" />
                                <span>Nächste: {nextInstance.toLocaleDateString()}</span>
                              </span>
                            )}
                            <span className="flex items-center space-x-1">
                              <BarChart3 className="w-3 h-3" />
                              <span>{instanceCount} Instanzen</span>
                            </span>
                          </div>
                          
                          {task.tags.length > 0 && (
                            <div className="flex items-center space-x-1 mt-2">
                              <TagIcon className="w-3 h-3 text-gray-400" />
                              <div className="flex flex-wrap gap-1">
                                {task.tags.map((tag, index) => (
                                  <span
                                    key={index}
                                    className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEditSeries(task)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all duration-200"
                            title={series.editNextInstance()}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSeries(task)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all duration-200"
                            title={series.deleteSeries()}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Task Modal for editing next instance */}
      <TaskModal
        task={editingTask}
        isOpen={showTaskModal}
        onClose={() => {
          setShowTaskModal(false);
          setEditingTask(null);
        }}
      />

      {/* Series Delete Modal */}
      <SeriesDeleteModal
        isOpen={showSeriesDeleteModal}
        onClose={() => {
          setShowSeriesDeleteModal(false);
          setDeletingSeries(null);
        }}
        onDeleteInstance={handleDeleteInstance}
        onDeleteSeries={handleDeleteEntireSeries}
        taskTitle={state.tasks.find(t => t.id === deletingSeries)?.title || ''}
      />

      {/* Legacy Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDeleteSeries}
        title={series.deleteSeriesTitle()}
        message={series.deleteSeriesMessage()}
        warningText={series.deleteSeriesWarning()}
      />
      </div>
    </div>
  );
}; 