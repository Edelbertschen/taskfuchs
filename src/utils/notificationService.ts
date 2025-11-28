import { Task } from '../types';

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  onClick?: () => void;
  onClose?: () => void;
}

class NotificationService {
  private isElectron: boolean = false;
  private permissionRequested: boolean = false;

  constructor() {
    // Check if running in Electron
    this.isElectron = !!(window as any).require;
    
    // Don't request permission immediately - wait for user interaction
    console.log('NotificationService initialized for:', this.isElectron ? 'Electron' : 'Web');
    
    // Warn developers about localhost notification issues
    if (!this.isElectron) {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isLocalhost && navigator.userAgent.includes('Chrome')) {
              console.warn('ENTWICKLER-HINWEIS: Chrome blockiert standardmäßig Benachrichtigungen auf localhost!');
      console.warn('Lösung: chrome://settings/content/notifications → Hinzufügen → ' + window.location.origin);
      console.warn('Alternative: chrome://flags/ → "Insecure origins treated as secure" → ' + window.location.origin);
      }
    }
  }

  // Request notification permission
  async requestPermission(): Promise<NotificationPermission> {
    if (this.isElectron) {
      // In Electron, notifications are always allowed
      console.log('Electron: Notifications always granted');
      return 'granted';
    }

    if (!('Notification' in window)) {
      console.warn('Notifications not supported in this browser');
      return 'denied';
    }

    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    console.log('Current notification permission:', Notification.permission);
    if (isLocalhost) {
      console.log('🔔 Running on localhost - Chrome may block notifications by default');
    }

    // If permission is already granted, return it
    if (Notification.permission === 'granted') {
      return 'granted';
    }

    // If permission was denied, don't keep asking
    if (Notification.permission === 'denied') {
      console.warn('Notification permission was denied by user');
      if (isLocalhost) {
        console.warn('For localhost development, you may need to manually enable notifications in Chrome settings');
      }
      return 'denied';
    }

    // Only request permission if it's default and we haven't asked yet
    if (Notification.permission === 'default') {
      console.log('Requesting notification permission...');
      this.permissionRequested = true;
      
      try {
        const permission = await Notification.requestPermission();
        console.log('Permission request result:', permission);
        
        if (permission === 'granted') {
          console.log('✅ Notification permission granted!');
          // Show welcome notification (but prevent infinite loop)
          setTimeout(() => {
            this.showWelcomeNotification();
          }, 500);
        } else {
                  console.warn('Notification permission denied by user');
        if (isLocalhost) {
          console.warn('For localhost development, check Chrome settings: chrome://settings/content/notifications');
          }
        }
        
        return permission;
      } catch (error) {
        console.error('Error requesting notification permission:', error);
        if (isLocalhost) {
          console.error('💡 This may be due to Chrome blocking notifications on localhost. Check the manual fix above.');
        }
        return 'denied';
      }
    }

    return Notification.permission;
  }

  // Separate method for welcome notification to prevent recursion
  private showWelcomeNotification(): void {
    try {
      const notification = new Notification('TaskFuchs Benachrichtigungen aktiviert! 🦊', {
        body: 'Sie erhalten jetzt Desktop-Benachrichtigungen für Aufgaben und Timer.',
        icon: '/3d_fox.png',
        tag: 'welcome'
      });

      setTimeout(() => {
        notification.close();
      }, 4000);
    } catch (error) {
      console.error('Error showing welcome notification:', error);
    }
  }

  // Helper to show permission reset instructions
  private showPermissionHelper(): void {
    let message = '';
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (navigator.userAgent.includes('Chrome')) {
      if (isLocalhost) {
        message = `🔔 Benachrichtigungen für localhost aktivieren:

⚠️ Chrome blockiert standardmäßig Benachrichtigungen auf localhost!

🛠️ Entwickler-Lösung:
1. Öffnen Sie: chrome://settings/content/notifications
2. Klicken Sie auf "Hinzufügen" neben "Zulassen"
3. Geben Sie ein: ${window.location.origin}
4. Laden Sie die Seite neu (F5)

🔧 Alternative:
1. Öffnen Sie: chrome://flags/
2. Suchen Sie: "Insecure origins treated as secure"
3. Aktivieren Sie das Flag und fügen Sie hinzu: ${window.location.origin}
4. Chrome neu starten

🔒 Oder direkt:
1. Klicken Sie auf das 🔒 Symbol in der Adressleiste
2. Wählen Sie "Benachrichtigungen" → "Zulassen"
3. Laden Sie die Seite neu (F5)`;
      } else {
        message = `🔔 Benachrichtigungen aktivieren:

1. Klicken Sie auf das 🔒 Symbol in der Adressleiste
2. Wählen Sie "Benachrichtigungen" → "Zulassen"
3. Laden Sie die Seite neu (F5)

Oder:
• Chrome-Einstellungen → Datenschutz und Sicherheit → Website-Einstellungen → Benachrichtigungen
• Suchen Sie diese Website und ändern Sie auf "Zulassen"`;
      }
    } else if (navigator.userAgent.includes('Firefox')) {
      message = `🔔 Benachrichtigungen aktivieren:

1. Klicken Sie auf das 🛡️ Symbol in der Adressleiste
2. Aktivieren Sie "Benachrichtigungen"
3. Laden Sie die Seite neu (F5)`;
    } else {
      message = `🔔 Benachrichtigungen aktivieren:

1. Schauen Sie nach einem Symbol (🔒 oder 🛡️) in der Adressleiste
2. Aktivieren Sie Benachrichtigungen für diese Website
3. Laden Sie die Seite neu (F5)`;
    }

    // Create a styled modal instead of basic alert
    this.showPermissionModal(message);
  }

  // Show styled permission modal
  private showPermissionModal(message: string): void {
    // Get user's accent color from localStorage
    const preferences = JSON.parse(localStorage.getItem('taskfuchs-preferences') || '{}');
    const accentColor = preferences.accentColor || '#3b82f6';
    
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(12px);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.3s ease-out;
    `;

    // Create modal content
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white;
      border-radius: 24px;
      padding: 40px;
      max-width: 600px;
      width: 90%;
      margin: 20px;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
      animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      position: relative;
      overflow: hidden;
    `;

    modal.innerHTML = `
      <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, ${accentColor}, ${accentColor}aa);"></div>
      
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="width: 80px; height: 80px; margin: 0 auto 20px; background: linear-gradient(135deg, ${accentColor}15, ${accentColor}08); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
          <div style="width: 50px; height: 50px; background: ${accentColor}; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 32px ${accentColor}40;">
            <svg width="24" height="24" fill="none" stroke="white" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5zM19 5H7.72c-.26 0-.52.11-.71.29L3.29 8.71a1 1 0 000 1.41l3.72 3.72c.19.19.45.29.71.29H19a2 2 0 002-2V7a2 2 0 00-2-2z"></path>
            </svg>
          </div>
        </div>
        <h2 style="margin: 0; color: #0f172a; font-size: 28px; font-weight: 700; line-height: 1.2;">
          Benachrichtigungen aktivieren
        </h2>
        <p style="margin: 8px 0 0 0; color: #64748b; font-size: 16px; font-weight: 400;">
          Verpassen Sie keine wichtigen Aufgaben mehr
        </p>
      </div>
      
      <div style="background: #f8fafc; border-radius: 16px; padding: 24px; margin-bottom: 32px; border-left: 4px solid ${accentColor};">
        <div style="white-space: pre-line; line-height: 1.7; color: #334155; margin: 0; font-size: 15px;">
          ${message}
        </div>
      </div>
      
      <div style="display: flex; gap: 12px; justify-content: center;">
        <button id="permission-ok" style="
          background: linear-gradient(135deg, ${accentColor}, ${accentColor}dd);
          color: white;
          border: none;
          padding: 14px 32px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px ${accentColor}40;
          min-width: 140px;
        " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 25px ${accentColor}40';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px ${accentColor}40';">
          Verstanden
        </button>
        <button id="permission-reload" style="
          background: #f1f5f9;
          color: #475569;
          border: none;
          padding: 14px 28px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          min-width: 120px;
        " onmouseover="this.style.background='#e2e8f0';" onmouseout="this.style.background='#f1f5f9';">
          Seite neu laden
        </button>
      </div>
    `;

    // Add animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideUp {
        from { transform: translateY(30px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Handle close
    const closeModal = () => {
      overlay.style.animation = 'fadeIn 0.2s ease-out reverse';
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
        if (style.parentNode) {
          style.parentNode.removeChild(style);
        }
      }, 200);
    };

    // Close on button click or overlay click
    const okButton = modal.querySelector('#permission-ok');
    const reloadButton = modal.querySelector('#permission-reload');
    
    if (okButton) {
      okButton.addEventListener('click', closeModal);
    }
    
    if (reloadButton) {
      reloadButton.addEventListener('click', () => {
        window.location.reload();
      });
    }
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    });

    // Close on Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  // Show a desktop notification
  async showNotification(options: NotificationOptions): Promise<void> {
    // Always request permission when showing notification
    const permission = await this.requestPermission();
    
    if (permission !== 'granted') {
      console.warn('Notification permission not granted:', permission);
      
      // Show helpful message if permission was denied
      if (!this.isElectron && permission === 'denied') {
        this.showPermissionHelper();
      }
      return;
    }

    if (this.isElectron) {
      this.showElectronNotification(options);
    } else {
      this.showWebNotification(options);
    }
  }

  // Show Electron notification
  private showElectronNotification(options: NotificationOptions): void {
    try {
      const { ipcRenderer } = (window as any).require('electron');
      
      ipcRenderer.send('show-notification', {
        title: options.title,
        body: options.body,
        icon: options.icon || '/Fuchs.svg',
        silent: options.silent || false,
        requireInteraction: options.requireInteraction || false,
        tag: options.tag
      });

      // Handle click events
      if (options.onClick) {
        ipcRenderer.once(`notification-click-${options.tag}`, options.onClick);
      }
    } catch (error) {
      console.error('Error showing Electron notification:', error);
      // Fallback to web notification
      this.showWebNotification(options);
    }
  }

  // Show web notification
  private showWebNotification(options: NotificationOptions): void {
    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/Fuchs.svg',
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false
      });

      if (options.onClick) {
        notification.onclick = () => {
          window.focus();
          options.onClick?.();
          notification.close();
        };
      }

      if (options.onClose) {
        notification.onclose = options.onClose;
      }

      // Auto-close after 5 seconds if not requireInteraction
      if (!options.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }
    } catch (error) {
      console.error('Error showing web notification:', error);
    }
  }

  // Task reminder notification
  showTaskReminder(task: Task, onClick?: () => void): void {
    this.showNotification({
      title: `📋 Erinnerung: ${task.title}`,
      body: task.description || 'Eine Aufgabe benötigt Ihre Aufmerksamkeit',
      icon: '/3d_fox.png',
      tag: `task-reminder-${task.id}`,
      requireInteraction: true,
      onClick
    });
  }

  // Timer completion notification
  showTimerCompletion(taskTitle: string, timeSpent: number, onClick?: () => void): void {
    const minutes = Math.round(timeSpent / 60 * 10) / 10; // Max 1 decimal place
    const timeString = minutes >= 1 ? `${minutes} min` : `${Math.round(timeSpent)} s`;
    
    this.showNotification({
      title: `Timer beendet`,
      body: `${taskTitle} - ${timeString} gearbeitet`,
      icon: '/3d_fox.png',
      tag: `timer-completion-${Date.now()}`,
      requireInteraction: true,
      onClick
    });
  }

  // Timer overtime notification
  showTimerOvertime(taskTitle: string, overtimeMinutes: number, onClick?: () => void): void {
    const timeText = overtimeMinutes === 1 ? '1 Minute' : `${overtimeMinutes} Minuten`;
    this.showNotification({
      title: `Überstunden bei ${taskTitle}`,
      body: `Sie arbeiten bereits ${timeText} länger als geplant. Erwägen Sie, die Aufgabe zu beenden oder Zeit hinzuzufügen.`,
      icon: '/3d_fox.png',
      tag: `timer-overtime-${Date.now()}`,
      requireInteraction: true,
      onClick
    });
  }

  // Timer warning notification (e.g., 5 minutes before estimated time)
  showTimerWarning(taskTitle: string, minutesLeft: number, onClick?: () => void): void {
    const timeText = minutesLeft === 1 ? '1 Minute' : `${minutesLeft} Minuten`;
    this.showNotification({
      title: `${taskTitle} - Zeitwarnung`,
      body: `Noch ${timeText} bis zur geschätzten Zeit.`,
      icon: '/3d_fox.png',
      tag: `timer-warning-${Date.now()}`,
      requireInteraction: true,
      onClick
    });
  }

  // Critical timer deadline reached notification with add time option
  showTimerDeadlineReached(taskTitle: string, taskId: string, onAddTime: (minutes: number) => void, onClick?: () => void): void {
    this.showNotification({
      title: `Zeit erreicht - ${taskTitle}`,
      body: `Die geschätzte Zeit ist erreicht. Klicken Sie hier um Zeit hinzuzufügen oder die Aufgabe zu beenden.`,
      icon: '/3d_fox.png',
      tag: `timer-deadline-${Date.now()}`,
      requireInteraction: true,
      onClick: () => {
        // Open quick action modal for adding time
        this.showQuickTimeModal(taskTitle, taskId, onAddTime);
        onClick?.();
      }
    });
  }

  // Quick time modal for adding time from notification
  private showQuickTimeModal(taskTitle: string, taskId: string, onAddTime: (minutes: number) => void): void {
    // Get user's accent color from localStorage
    const preferences = JSON.parse(localStorage.getItem('taskfuchs-preferences') || '{}');
    const accentColor = preferences.accentColor || '#3b82f6';
    
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
    modal.style.backdropFilter = 'blur(12px)';
    (modal.style as any).WebkitBackdropFilter = 'blur(12px)';
    modal.style.animation = 'fadeIn 0.3s ease-out';

    const content = document.createElement('div');
    content.className = 'bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8 max-w-md w-full mx-4 border border-gray-100 dark:border-gray-800';
    content.style.animation = 'slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
    
    // Add keyframe animations
    if (!document.querySelector('#timer-modal-styles')) {
      const style = document.createElement('style');
      style.id = 'timer-modal-styles';
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInUp {
          from { 
            opacity: 0;
            transform: translateY(32px) scale(0.95);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `;
      document.head.appendChild(style);
    }

    content.innerHTML = `
      <div class="text-center">
        <div class="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center" style="background: linear-gradient(135deg, ${accentColor}15, ${accentColor}08)">
          <div class="w-12 h-12 rounded-full flex items-center justify-center" style="background-color: ${accentColor}; box-shadow: 0 8px 32px ${accentColor}40">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
        </div>
        
        <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-3">Zeit erreicht</h2>
        <p class="text-lg text-gray-700 dark:text-gray-300 mb-2 font-medium">${taskTitle}</p>
        <p class="text-gray-500 dark:text-gray-400 text-sm mb-8 leading-relaxed">Die geschätzte Zeit ist erreicht.<br>Möchten Sie mehr Zeit hinzufügen?</p>
        
        <div class="grid grid-cols-3 gap-3 mb-8">
          <button class="quick-time-btn group px-4 py-3 rounded-xl text-white text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95" style="background: linear-gradient(135deg, ${accentColor}, ${accentColor}dd)" data-minutes="15">
            <div class="text-lg font-bold">15</div>
            <div class="text-xs opacity-90">Minuten</div>
          </button>
          <button class="quick-time-btn group px-4 py-3 rounded-xl text-white text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95" style="background: linear-gradient(135deg, ${accentColor}, ${accentColor}dd)" data-minutes="30">
            <div class="text-lg font-bold">30</div>
            <div class="text-xs opacity-90">Minuten</div>
          </button>
          <button class="quick-time-btn group px-4 py-3 rounded-xl text-white text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95" style="background: linear-gradient(135deg, ${accentColor}, ${accentColor}dd)" data-minutes="60">
            <div class="text-lg font-bold">60</div>
            <div class="text-xs opacity-90">Minuten</div>
          </button>
        </div>
        
        <div class="pt-4 border-t border-gray-100 dark:border-gray-800">
          <button class="continue-btn text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm font-medium transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800 px-6 py-2 rounded-lg">
            Ohne zusätzliche Zeit fortfahren
          </button>
        </div>
      </div>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    // Add event listeners
    const quickTimeBtns = content.querySelectorAll('.quick-time-btn');
    quickTimeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const minutes = parseInt(btn.getAttribute('data-minutes') || '15');
        onAddTime(minutes);
        document.body.removeChild(modal);
      });
    });

    const continueBtn = content.querySelector('.continue-btn');
    continueBtn?.addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });

    // Auto-focus for accessibility
    setTimeout(() => {
      const firstBtn = content.querySelector('.quick-time-btn') as HTMLElement;
      firstBtn?.focus();
    }, 100);
  }

  // Task completion notification
  showTaskCompleted(taskTitle: string, onClick?: () => void): void {
    this.showNotification({
      title: `Aufgabe abgeschlossen`,
      body: `${taskTitle} erfolgreich beendet`,
      icon: '/3d_fox.png',
      tag: `task-completed-${Date.now()}`,
      requireInteraction: false,
      onClick
    });
  }

  // Daily summary notification
  showDailySummary(completedTasks: number, totalTime: number): void {
    const hours = Math.round(totalTime / 3600 * 10) / 10; // Max 1 decimal place
    const minutes = Math.round((totalTime % 3600) / 60 * 10) / 10; // Max 1 decimal place
    const timeString = hours >= 1 ? `${hours} h` : `${minutes} min`;

    this.showNotification({
      title: `Tagesübersicht`,
      body: `${completedTasks} Aufgaben abgeschlossen in ${timeString}`,
      icon: '/3d_fox.png',
      tag: `daily-summary-${Date.now()}`,
      requireInteraction: false
    });
  }

  // Check if notifications are supported
  isSupported(): boolean {
    return 'Notification' in window || this.isElectron;
  }

  // Get current permission status
  getPermissionStatus(): NotificationPermission {
    if (this.isElectron) {
      return 'granted';
    }
    return 'Notification' in window ? Notification.permission : 'denied';
  }
}

// Export singleton instance
export const notificationService = new NotificationService(); 