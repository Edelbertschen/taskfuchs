import { Task, RecurringTaskConfig } from '../types';

/**
 * Service for managing recurring tasks and their automatic generation
 */
export class RecurringTaskService {
  /**
   * Generates task instances for the next 14 days for all recurring tasks
   */
  static generateUpcomingInstances(tasks: Task[]): Task[] {
    const now = new Date();
    const fourteenDaysFromNow = new Date();
    fourteenDaysFromNow.setDate(now.getDate() + 14);
    
    const seriesTasks = tasks.filter(task => 
      task.recurring?.enabled && task.isSeriesTemplate
    );
    
    const newInstances: Task[] = [];
    
    seriesTasks.forEach(seriesTask => {
      const instances = this.generateInstancesForPeriod(
        seriesTask,
        now,
        fourteenDaysFromNow,
        tasks
      );
      newInstances.push(...instances);
    });
    
    return newInstances;
  }
  
  /**
   * Generates task instances for a specific series within a date range
   */
  private static generateInstancesForPeriod(
    seriesTask: Task,
    startDate: Date,
    endDate: Date,
    existingTasks: Task[]
  ): Task[] {
    if (!seriesTask.recurring?.enabled || !seriesTask.dueDate) {
      return [];
    }
    
    const instances: Task[] = [];
    const baseDate = new Date(seriesTask.dueDate);
    const config = seriesTask.recurring;
    
    // Find the next occurrence date after the last generated instance
    let currentDate = this.getNextOccurrenceDate(baseDate, config, startDate);
    
    // Generate instances until end date or max occurrences reached
    let occurrenceCount = 0;
    const maxOccurrences = config.maxOccurrences || 1000; // Default limit
    
    while (
      currentDate <= endDate && 
      occurrenceCount < maxOccurrences &&
      (!config.endDate || currentDate <= new Date(config.endDate))
    ) {
      // Check if instance already exists
      const existingInstance = existingTasks.find(task =>
        task.parentSeriesId === seriesTask.id &&
        task.dueDate === currentDate.toISOString().split('T')[0]
      );
      
      if (!existingInstance) {
        const instance = this.createTaskInstance(seriesTask, currentDate);
        instances.push(instance);
      }
      
      // Move to next occurrence
      currentDate = this.getNextOccurrenceDate(baseDate, config, currentDate);
      occurrenceCount++;
    }
    
    return instances;
  }
  
  /**
   * Creates a task instance from a series template
   */
  private static createTaskInstance(seriesTask: Task, dueDate: Date): Task {
    const instanceId = `${seriesTask.id}_${dueDate.toISOString().split('T')[0]}`;
    
    return {
      ...seriesTask,
      id: instanceId,
      parentSeriesId: seriesTask.id,
      isSeriesTemplate: false,
      dueDate: dueDate.toISOString().split('T')[0],
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Reset timer and tracking data for new instance
      timerState: undefined,
      actualTime: 0,
      trackedTime: 0,
      completedAt: undefined,
      // Generate column assignment based on due date
      columnId: this.getColumnIdForDate(dueDate)
    };
  }
  
  /**
   * Gets the next occurrence date based on recurrence configuration
   */
  private static getNextOccurrenceDate(
    baseDate: Date,
    config: RecurringTaskConfig,
    fromDate: Date
  ): Date {
    const nextDate = new Date(fromDate);
    
    switch (config.type) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + (config.interval || 1));
        break;
        
      case 'weekly':
        if (config.daysOfWeek && config.daysOfWeek.length > 0) {
          // Find next occurrence on specified days of week
          nextDate.setDate(nextDate.getDate() + 1);
          while (!config.daysOfWeek.includes(nextDate.getDay())) {
            nextDate.setDate(nextDate.getDate() + 1);
          }
        } else {
          nextDate.setDate(nextDate.getDate() + (7 * (config.interval || 1)));
        }
        break;
        
      case 'monthly':
        if (config.dayOfMonth) {
          nextDate.setMonth(nextDate.getMonth() + (config.interval || 1));
          nextDate.setDate(config.dayOfMonth);
        } else {
          // Keep same day of month as base date
          const targetDay = baseDate.getDate();
          nextDate.setMonth(nextDate.getMonth() + (config.interval || 1));
          nextDate.setDate(Math.min(targetDay, this.getDaysInMonth(nextDate)));
        }
        break;
        
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + (config.interval || 1));
        // Keep same month and day
        nextDate.setMonth(baseDate.getMonth());
        nextDate.setDate(baseDate.getDate());
        break;
    }
    
    return nextDate;
  }
  
  /**
   * Gets the column ID for a specific date (for planner view)
   */
  private static getColumnIdForDate(date: Date): string {
    return `date-${date.toISOString().split('T')[0]}`;
  }
  
  /**
   * Helper function to get number of days in a month
   */
  private static getDaysInMonth(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }
  
  /**
   * Performs daily maintenance - generates new instances and cleans up old ones
   */
  static performDailyMaintenance(tasks: Task[]): Task[] {
    const now = new Date();
    
    // Generate new instances for next 14 days
    const newInstances = this.generateUpcomingInstances(tasks);
    
    // Update last generated timestamp for series tasks
    const updatedTasks = tasks.map(task => {
      if (task.recurring?.enabled && task.isSeriesTemplate) {
        return {
          ...task,
          recurring: {
            ...task.recurring,
            lastGenerated: now.toISOString()
          }
        };
      }
      return task;
    });
    
    return [...updatedTasks, ...newInstances];
  }
  
  /**
   * Checks if a task should have its series updated when modified
   */
  static shouldPromptForSeriesUpdate(task: Task): boolean {
    return !!(task.parentSeriesId && !task.isSeriesTemplate);
  }
  
  /**
   * Updates all instances of a series with new properties
   */
  static updateSeriesInstances(
    tasks: Task[],
    seriesId: string,
    updates: Partial<Task>
  ): Task[] {
    return tasks.map(task => {
      if (task.parentSeriesId === seriesId || task.id === seriesId) {
        return {
          ...task,
          ...updates,
          updatedAt: new Date().toISOString()
        };
      }
      return task;
    });
  }
  
  /**
   * Deletes all instances of a series
   */
  static deleteSeriesInstances(tasks: Task[], seriesId: string): Task[] {
    return tasks.filter(task => 
      task.id !== seriesId && task.parentSeriesId !== seriesId
    );
  }
  
  /**
   * Creates a new recurring task series
   */
  static createRecurringSeries(
    title: string,
    description: string,
    dueDate: Date,
    recurring: RecurringTaskConfig,
    columnId: string,
    additionalProperties: Partial<Task> = {}
  ): Task {
    const seriesId = `series_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: seriesId,
      title,
      description,
      completed: false,
      tags: [],
      subtasks: [],
      columnId,
      dueDate: dueDate.toISOString().split('T')[0],
      recurring,
      isSeriesTemplate: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      position: Date.now(),
      color: '#6b7280',
      ...additionalProperties
    };
  }
}

/**
 * Hook for automatic daily maintenance
 * Should be called when the app starts or when the date changes
 */
export function initializeRecurringTaskMaintenance(
  tasks: Task[],
  updateTasks: (tasks: Task[]) => void
) {
  const lastMaintenanceDate = localStorage.getItem('lastRecurringTaskMaintenance');
  const today = new Date().toISOString().split('T')[0];
  
  if (lastMaintenanceDate !== today) {
    console.log('Performing recurring task maintenance...');
    const updatedTasks = RecurringTaskService.performDailyMaintenance(tasks);
    updateTasks(updatedTasks);
    localStorage.setItem('lastRecurringTaskMaintenance', today);
  }
} 