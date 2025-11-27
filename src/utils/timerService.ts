import { ActiveTimerContext, UserPreferences } from '../types';
import { playCompletionSound, startWhiteNoise, stopWhiteNoise } from './soundUtils';
import { notificationService } from './notificationService';

type TimerCallback = (context: ActiveTimerContext) => void;
type TimerEndCallback = (context: ActiveTimerContext, reason: 'completed' | 'overtime' | 'stopped') => void;
// New callback type for timer persistence
type TimerPersistenceCallback = (taskId: string, elapsedTime: number) => void;

interface TimerEventCallbacks {
  onTick?: TimerCallback;
  onTaskTimeEnd?: TimerCallback;
  onPause?: TimerCallback;
  onResume?: TimerCallback;
  onStop?: TimerEndCallback;
  // New callback for saving timer progress
  onTimerPersisted?: TimerPersistenceCallback;
  // New callback for when time is added to a task
  onTimeAdded?: (taskId: string, addedMinutes: number, newEstimatedTime: number) => void;
}

class TimerService {
  private activeTimer: ActiveTimerContext | null = null;
  private intervalId: number | null = null;
  private callbacks: TimerEventCallbacks = {};
  private preferences: UserPreferences | null = null;
  private warningNotificationSent: boolean = false;
  private overtimeNotificationSent: boolean = false;
  public lastUIUpdate: number = 0;

  // Initialize timer service with preferences
  initialize(preferences: UserPreferences) {
    this.preferences = preferences;
  }

  // Update preferences (alias for initialize for backward compatibility)
  updatePreferences(preferences: UserPreferences) {
    this.initialize(preferences);
  }

  // Set event callbacks
  setCallbacks(callbacks: TimerEventCallbacks) {
    this.callbacks = callbacks;
  }

  // Start or resume a timer for a task
  startTimer(
    taskId: string,
    taskTitle: string,
    estimatedTime: number,
    trackedTime?: number
  ): ActiveTimerContext {
    try {
      // Stop any existing timer
      this.stopTimer('stopped');

      // Reset notification flags for new timer
      this.warningNotificationSent = false;
      this.overtimeNotificationSent = false;

      const now = Date.now();
      // Use trackedTime from task if available, otherwise start from 0
      const elapsedTime = trackedTime || 0;
      const remainingTime = Math.max(0, estimatedTime - elapsedTime);

      // Create task timer
      this.activeTimer = {
        taskId,
        taskTitle,
        estimatedTime,
        elapsedTime,
        remainingTime,
        isActive: true,
        isPaused: false
      };

      this.startTaskInterval();
      
      // Start Toggl timer sync asynchronously to avoid blocking timer start
      setTimeout(() => {
        console.log('🔄 Timer started, initiating Toggl sync...');
        this.syncTogglStart(taskId, taskTitle, estimatedTime, elapsedTime);
      }, 100);
      
      return this.activeTimer;
    } catch (error) {
      console.error('Error starting timer:', error);
      throw error;
    }
  }

  // Pause the active task timer
  pauseTimer(): ActiveTimerContext | null {
    if (!this.activeTimer || this.activeTimer.isPaused) return this.activeTimer;

    this.activeTimer.isPaused = true;
    this.stopTaskInterval();
    
    // Sync with Toggl
    this.syncTogglPause();
    
    this.callbacks.onPause?.(this.activeTimer);
    return this.activeTimer;
  }

  // Resume the paused task timer
  resumeTimer(): ActiveTimerContext | null {
    if (!this.activeTimer || !this.activeTimer.isPaused) return this.activeTimer;

    this.activeTimer.isPaused = false;
    this.startTaskInterval();
    
    // Sync with Toggl
    this.syncTogglResume(this.activeTimer.taskId, this.activeTimer.taskTitle, this.activeTimer.elapsedTime);
    
    this.callbacks.onResume?.(this.activeTimer);
    return this.activeTimer;
  }

  // Stop the active timer
  stopTimer(reason: 'completed' | 'overtime' | 'stopped' = 'stopped'): void {
    if (!this.activeTimer) return;

    const timerContext = { ...this.activeTimer };
    this.stopTaskInterval();
    
    // Persist the elapsed time before clearing the timer
    if (this.callbacks.onTimerPersisted && timerContext.elapsedTime > 0) {
      this.callbacks.onTimerPersisted(timerContext.taskId, timerContext.elapsedTime);
    }
    
    // Sync with Toggl
    this.syncTogglStop(timerContext.taskId, timerContext.elapsedTime);
    
    this.activeTimer = null;
    
    // Pomodoro session continues running independently
    this.callbacks.onStop?.(timerContext, reason);
  }

  // Get current timer context
  getActiveTimer(): ActiveTimerContext | null {
    return this.activeTimer;
  }

  // Add time to the active timer
  adjustTimerTime(minutes: number): boolean {
    if (!this.activeTimer) {
      console.warn('No active timer to adjust');
      return false;
    }

    try {
      // Update estimated time (can be negative to reduce time)
      this.activeTimer.estimatedTime += minutes;
      
      // Ensure estimated time doesn't go below 1 minute
      this.activeTimer.estimatedTime = Math.max(1, this.activeTimer.estimatedTime);
      
      // Recalculate remaining time
      this.activeTimer.remainingTime = this.activeTimer.estimatedTime - this.activeTimer.elapsedTime;
      
      // Reset overtime flag if we're back within time
      if (this.activeTimer.remainingTime > 0) {
        this.activeTimer.isOvertime = false;
      }
      
      console.log(`⏱️ Timer time adjusted by ${minutes} minutes for "${this.activeTimer.taskTitle}":`, {
        newEstimatedTime: this.activeTimer.estimatedTime,
        remainingTime: this.activeTimer.remainingTime,
        elapsedTime: this.activeTimer.elapsedTime
      });
      
      // Notify callbacks about the time update
      this.callbacks.onTick?.(this.activeTimer);
      
      // Trigger callback for time additions
      this.callbacks.onTimeAdded?.(this.activeTimer.taskId, minutes, this.activeTimer.estimatedTime);
      
      return true;
    } catch (error) {
      console.error('Error adjusting timer time:', error);
      return false;
    }
  }

  // Check if timer is running
  isTimerActive(): boolean {
    return this.activeTimer?.isActive && !this.activeTimer?.isPaused;
  }

  // Private methods for task timer
  private startTaskInterval() {
    this.stopTaskInterval();
    const startWallClock = Date.now();
    let lastTickWallClock = startWallClock;
    this.intervalId = window.setInterval(() => {
      const now = Date.now();
      const deltaMs = now - lastTickWallClock;
      lastTickWallClock = now;
      // Compensate if browser throttled the interval (background/tab inactive)
      if (deltaMs > 1500 && this.activeTimer && !this.activeTimer.isPaused) {
        const deltaMinutes = deltaMs / 60000;
        // Apply missed time in one go
        this.activeTimer.elapsedTime += deltaMinutes;
        if (this.activeTimer.estimatedTime > 0) {
          this.activeTimer.remainingTime = this.activeTimer.estimatedTime - this.activeTimer.elapsedTime;
          // Handle overtime notifications and end logic as in tick
          if (!this.warningNotificationSent && this.activeTimer.remainingTime <= 5 && this.activeTimer.remainingTime > 0) {
            this.warningNotificationSent = true;
            notificationService.showTimerWarning(
              this.activeTimer.taskTitle,
              Math.ceil(this.activeTimer.remainingTime),
              () => window.focus()
            );
          }
          if (this.activeTimer.remainingTime <= 0 && this.activeTimer.elapsedTime >= this.activeTimer.estimatedTime) {
            if (!this.activeTimer.isOvertime) {
              this.activeTimer.isOvertime = true;
              this.handleTaskTimeEnd();
            }
          }
        } else {
          // No estimate → no remaining time or warnings
          this.activeTimer.remainingTime = 0;
          this.activeTimer.isOvertime = false;
        }
        this.callbacks.onTick?.(this.activeTimer);
      } else {
        this.tickTask();
      }
    }, 1000);
  }

  private stopTaskInterval() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // Separate tick for task timer
  private tickTask() {
    try {
      if (!this.activeTimer || this.activeTimer.isPaused) return;

      // Add 1/60 minute (1 second) to elapsed time
      this.activeTimer.elapsedTime += 1/60;
      
      if (this.activeTimer.estimatedTime > 0) {
        // Calculate remaining time (can be negative for overtime)
        this.activeTimer.remainingTime = this.activeTimer.estimatedTime - this.activeTimer.elapsedTime;

        // Send warning notification 5 minutes before estimated time (only once)
        if (!this.warningNotificationSent && this.activeTimer.remainingTime <= 5 && this.activeTimer.remainingTime > 0) {
          this.warningNotificationSent = true;
          notificationService.showTimerWarning(
            this.activeTimer.taskTitle, 
            Math.ceil(this.activeTimer.remainingTime), 
            () => window.focus()
          );
        }

        // Check if task time is completed (but timer continues in overtime)
        if (this.activeTimer.remainingTime <= 0 && this.activeTimer.elapsedTime >= this.activeTimer.estimatedTime) {
          // Only trigger the end callback once when transitioning to overtime
          if (!this.activeTimer.isOvertime) {
            this.activeTimer.isOvertime = true;
            this.handleTaskTimeEnd();
          }
          
          // Send overtime notifications every 10 minutes
          const overtimeMinutes = Math.floor(Math.abs(this.activeTimer.remainingTime));
          if (overtimeMinutes > 0 && overtimeMinutes % 10 === 0 && !this.overtimeNotificationSent) {
            this.overtimeNotificationSent = true;
            notificationService.showTimerOvertime(
              this.activeTimer.taskTitle,
              overtimeMinutes,
              () => window.focus()
            );
            
            // Reset overtime notification flag after 1 minute to allow next notification
            setTimeout(() => {
              this.overtimeNotificationSent = false;
            }, 60000);
          }
        }
      } else {
        // No estimate → keep remaining at 0, never warn/overrun
        this.activeTimer.remainingTime = 0;
        this.activeTimer.isOvertime = false;
      }

      // Trigger tick callback
      this.callbacks.onTick?.(this.activeTimer);
    } catch (error) {
      console.error('Error in task timer tick:', error);
    }
  }

  private handleTaskTimeEnd() {
    if (!this.activeTimer) return;

    console.log('Handling task time end for:', this.activeTimer.taskTitle);

    // Play notice sound for task deadline
    if (this.preferences?.timer?.soundEnabled) {
      playCompletionSound('notice', this.preferences.soundVolume).catch(console.warn);
    }

    // Create callback function for adding time
    const onAddTime = (minutes: number) => {
      if (this.activeTimer) {
        // Update estimated time
        this.activeTimer.estimatedTime += minutes;
        // Recalculate remaining time
        this.activeTimer.remainingTime = this.activeTimer.estimatedTime - this.activeTimer.elapsedTime;
        // Reset overtime flag if we're back within time
        if (this.activeTimer.remainingTime > 0) {
          this.activeTimer.isOvertime = false;
        }
        
        // Notify callbacks about the time update
        this.callbacks.onTick?.(this.activeTimer);
        
        // Trigger a custom callback specifically for time additions
        this.callbacks.onTimeAdded?.(this.activeTimer.taskId, minutes, this.activeTimer.estimatedTime);
      }
    };

    // Show critical deadline notification with add time option
    notificationService.showTimerDeadlineReached(
      this.activeTimer.taskTitle,
      this.activeTimer.taskId,
      onAddTime,
      () => window.focus()
    );

    this.callbacks.onTaskTimeEnd?.(this.activeTimer);
    
    // Task timer continues running in overtime mode (negative time)
  }

  // Utility methods
  formatTime(minutes: number): string {
    // Return empty string for 0 minutes to prevent showing "0:00"
    if (minutes === 0) return '';
    // Round to seconds to avoid artifacts like 1:070
    const sign = minutes < 0 ? '-' : '';
    let totalSeconds = Math.round(Math.abs(minutes) * 60);
    const hours = Math.floor(totalSeconds / 3600);
    totalSeconds = totalSeconds % 3600;
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (hours > 0) {
      return `${sign}${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${sign}${mins}:${secs.toString().padStart(2, '0')}`;
  }

  formatTimeShort(minutes: number): string {
    // Return empty string for 0 minutes to prevent showing "0m"  
    if (minutes === 0) return '';
    
    const absMinutes = Math.abs(minutes);
    const hours = Math.floor(absMinutes / 60);
    const mins = Math.floor(absMinutes % 60);
    
    const sign = minutes < 0 ? '-' : '';
    
    if (hours > 0) {
      return `${sign}${hours}h ${mins}m`;
    }
    return `${sign}${mins}m`;
  }

  // Toggl Integration Methods
  private currentTogglEntryId: number | null = null;
  private currentTogglWorkspaceId: number | null = null;

  private async syncTogglStart(taskId: string, taskTitle: string, estimatedTime: number, elapsedTime: number = 0): Promise<void> {
    console.log('🔵 syncTogglStart called with:', { taskId, taskTitle, estimatedTime, elapsedTime });
    console.log('🔍 Toggl preferences:', {
      enabled: this.preferences?.toggl?.enabled,
      syncOnStart: this.preferences?.toggl?.syncOnStart,
      apiToken: this.preferences?.toggl?.apiToken ? '[SET]' : '[NOT SET]',
      workspaceId: this.preferences?.toggl?.workspaceId
    });
    
    if (!this.preferences?.toggl?.enabled) {
      console.log('🟡 Toggl sync skipped: Integration not enabled');
      console.warn('⚠️ Toggl Timer Problem: Integration ist nicht aktiviert. Bitte aktivieren Sie die Toggl-Integration in den Einstellungen.');
      return;
    }

    if (!this.preferences?.toggl?.syncOnStart) {
      console.log('🟡 Toggl sync skipped: syncOnStart is disabled');
      console.warn('⚠️ Toggl Timer Problem: "Timer-Start synchronisieren" ist deaktiviert. Bitte aktivieren Sie diese Option in den Toggl-Einstellungen.');
      return;
    }

    if (!this.preferences?.toggl?.apiToken) {
      console.error('❌ Toggl Timer Problem: API-Token fehlt. Bitte fügen Sie Ihren Toggl API-Token in den Einstellungen hinzu.');
      return;
    }

    // Validate API token format (Toggl tokens are typically 32 characters)
    if (this.preferences.toggl.apiToken.length < 30) {
      console.error('❌ Toggl Timer Problem: API-Token scheint ungültig zu sein (zu kurz). Toggl API-Token sind normalerweise 32 Zeichen lang.');
      console.warn('💡 Lösung: Generieren Sie einen neuen API-Token in Toggl Track → Profile → API Token');
      return;
    }

    if (!this.preferences?.toggl?.workspaceId) {
      console.error('❌ Toggl Timer Problem: Workspace-ID fehlt. Bitte wählen Sie eine Workspace in den Toggl-Einstellungen aus.');
      return;
    }

    try {
      console.log('🔵 Starting Toggl sync for task:', { taskId, taskTitle, estimatedTime, elapsedTime });
      
      const { togglService } = await import('./togglService');
      togglService.updatePreferences(this.preferences);

      const workspaceId = parseInt(this.preferences.toggl.workspaceId);
      if (!workspaceId || isNaN(workspaceId)) {
        console.error('❌ Toggl Timer Problem: Workspace-ID ist nicht numerisch oder fehlt:', this.preferences.toggl.workspaceId);
        console.warn('💡 Lösung: Konfigurieren Sie eine gültige numerische Workspace-ID in den Toggl-Einstellungen.');
        return;
      }

      console.log('🔍 Toggl Timer Konfiguration überprüft:', {
        workspaceId: workspaceId,
        hasApiToken: !!this.preferences.toggl.apiToken,
        apiTokenLength: this.preferences.toggl.apiToken?.length || 0,
        syncOnStart: this.preferences.toggl.syncOnStart,
        enabled: this.preferences.toggl.enabled
      });

      // Get project ID if needed
      let projectId: number | undefined;
      if (this.preferences.toggl.createProjectsAutomatically) {
        // Try to get project from task's project assignment
        const task = this.getCurrentTask?.(taskId);
        if (task?.projectId) {
          projectId = await togglService.getOrCreateProject(task.projectId);
        }
      } else if (this.preferences.toggl.defaultProjectId) {
        projectId = parseInt(this.preferences.toggl.defaultProjectId);
      }

      // Create description
      const task = this.getCurrentTask?.(taskId);
      const description = this.preferences.toggl.useTaskDescriptions && task?.description
        ? `${taskTitle} - ${task.description}`
        : taskTitle;

      console.log('🔵 Toggl timer configuration:', { 
        workspaceId, 
        description, 
        projectId, 
        tags: task?.tags || [],
        apiToken: this.preferences.toggl.apiToken ? '[SET]' : '[NOT SET]'
      });

      // Start Toggl time entry
      const timeEntry = await togglService.startTimeEntry(
        workspaceId,
        description,
        projectId,
        task?.tags || []
      );

      this.currentTogglEntryId = timeEntry.id;
      this.currentTogglWorkspaceId = workspaceId;

      console.log('✅ Toggl Timer erfolgreich gestartet!');
      console.log('🔗 Toggl Time Entry Details:', {
        id: timeEntry.id,
        description: timeEntry.description,
        workspaceId: workspaceId,
        projectId: projectId || 'Kein Projekt',
        tags: task?.tags?.length ? task.tags.join(', ') : 'Keine Tags'
      });
      console.log('🎯 Timer läuft jetzt in Toggl Track:', `https://track.toggl.com/timer`);
      
      // Update last sync time
      this.updateTogglLastSync();
    } catch (error) {
      console.error('❌ Failed to start Toggl time entry:', error);
      
      // Enhanced user-friendly error notifications
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
          console.error('❌ Toggl Timer Problem: CORS-Fehler. Die Toggl-Integration funktioniert möglicherweise nur in der Desktop-Version der App.');
          console.warn('💡 Lösung: Verwenden Sie die Desktop-App oder prüfen Sie Ihre Browser-Einstellungen.');
        } else if (error.message.includes('401')) {
          console.error('❌ Toggl Timer Problem: API-Token ungültig. Bitte generieren Sie einen neuen API-Token in Toggl Track.');
          console.warn('💡 Lösung: Toggl Track → Profile → API Token → Neuen Token erstellen');
        } else if (error.message.includes('403')) {
          console.error('❌ Toggl Timer Problem: Zugriff verweigert. Berechtigung fehlt.');
          console.warn('💡 Lösung: Überprüfen Sie Ihre Workspace-Berechtigung in Toggl Track.');
        } else if (error.message.includes('404')) {
          console.error('❌ Toggl Timer Problem: Workspace nicht gefunden. Überprüfen Sie die Workspace-ID.');
          console.warn('💡 Lösung: Wählen Sie eine gültige Workspace in den Toggl-Einstellungen aus.');
        } else if (error.message.includes('Workspace ID')) {
          console.error('❌ Toggl Timer Problem: Workspace-ID fehlt oder ungültig.');
          console.warn('💡 Lösung: Konfigurieren Sie eine gültige Workspace-ID in den Toggl-Einstellungen.');
        } else {
          console.error('❌ Toggl Timer Problem: Unbekannter Fehler beim Starten des Timers.');
          console.warn('💡 Details:', error.message);
          console.warn('💡 Lösung: Überprüfen Sie Ihre Toggl-Konfiguration und Internetverbindung.');
        }
      } else {
        console.error('❌ Toggl Timer Problem: Unbekannter Fehler beim Starten des Timers.');
        console.warn('💡 Lösung: Starten Sie den Timer erneut oder überprüfen Sie die Toggl-Einstellungen.');
      }
    }
  }

  private async syncTogglPause(): Promise<void> {
    if (!this.preferences?.toggl?.enabled || !this.preferences?.toggl?.syncOnPause) {
      return;
    }

    try {
      if (this.currentTogglEntryId && this.currentTogglWorkspaceId) {
        const { togglService } = await import('./togglService');
        togglService.updatePreferences(this.preferences);

        await togglService.stopTimeEntry(this.currentTogglWorkspaceId, this.currentTogglEntryId);
        console.log('Paused Toggl time entry:', this.currentTogglEntryId);
        
        // Reset current entry since it's stopped
        this.currentTogglEntryId = null;
        this.currentTogglWorkspaceId = null;
        
        this.updateTogglLastSync();
      }
    } catch (error) {
      console.error('Failed to pause Toggl time entry:', error);
    }
  }

  private async syncTogglResume(taskId: string, taskTitle: string, elapsedTime: number = 0): Promise<void> {
    if (!this.preferences?.toggl?.enabled || !this.preferences?.toggl?.syncOnStart) {
      return;
    }

    // Resume is treated the same as start - create a new time entry
    await this.syncTogglStart(taskId, taskTitle, 0, elapsedTime);
  }

  private async syncTogglStop(taskId: string, elapsedTime: number): Promise<void> {
    if (!this.preferences?.toggl?.enabled || !this.preferences?.toggl?.syncOnStop) {
      return;
    }

    try {
      const { togglService } = await import('./togglService');
      togglService.updatePreferences(this.preferences);

      if (this.currentTogglEntryId && this.currentTogglWorkspaceId) {
        // Stop the current running entry
        await togglService.stopTimeEntry(this.currentTogglWorkspaceId, this.currentTogglEntryId);
        console.log('Stopped Toggl time entry:', this.currentTogglEntryId);
        
        this.currentTogglEntryId = null;
        this.currentTogglWorkspaceId = null;
      } else if (this.preferences.toggl.autoSync && elapsedTime > 0) {
        // If no current entry but we have tracked time, create a completed entry
        const task = this.getCurrentTask?.(taskId);
        if (task) {
          const trackedMinutes = this.preferences.toggl.roundTimeToMinutes 
            ? Math.round(elapsedTime) 
            : elapsedTime;

          // Get project ID if needed
          let projectId: number | undefined;
          if (this.preferences.toggl.createProjectsAutomatically && task.projectId) {
            projectId = await togglService.getOrCreateProject(task.projectId);
          } else if (this.preferences.toggl.defaultProjectId) {
            projectId = parseInt(this.preferences.toggl.defaultProjectId);
          }

          await togglService.syncCompletedTimeEntry(
            task.title,
            task.description || '',
            trackedMinutes,
            projectId
          );
          
          console.log('Synced completed time entry to Toggl:', trackedMinutes, 'minutes');
        }
      }
      
      this.updateTogglLastSync();
    } catch (error) {
      console.error('Failed to stop Toggl time entry:', error);
    }
  }

  private updateTogglLastSync(): void {
    if (this.preferences?.toggl) {
      const updatedPreferences = {
        ...this.preferences,
        toggl: {
          ...this.preferences.toggl,
          lastSync: new Date().toISOString(),
        },
      };
      
      // Update preferences in storage
      localStorage.setItem('taskfuchs-preferences', JSON.stringify(updatedPreferences));
    }
  }

  // Helper method to get current task (should be provided by the calling context)
  private getCurrentTask?: (taskId: string) => { 
    title: string; 
    description?: string; 
    projectId?: string; 
    tags?: string[] 
  } | null;

  // Set task provider for Toggl integration
  setTaskProvider(provider: (taskId: string) => { title: string; description?: string; projectId?: string; tags?: string[] } | null) {
    this.getCurrentTask = provider;
  }

  // Cleanup method
  destroy() {
    this.stopTimer('stopped');
    this.callbacks = {};
    this.preferences = null;
  }
}

// Export singleton instance
export const timerService = new TimerService(); 