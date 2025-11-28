import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ReminderOverlay } from './ReminderOverlay';
import { TaskModal } from '../Tasks/TaskModal';
import { Task } from '../../types';
import { notificationService } from '../../utils/notificationService';
import { Bell, X } from 'lucide-react';

export function NotificationManager() {
  const { state, dispatch } = useApp();
  const [currentReminder, setCurrentReminder] = useState<Task | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [checkedReminders, setCheckedReminders] = useState<Set<string>>(new Set());
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showPermissionBanner, setShowPermissionBanner] = useState(false);

  // Check if we should show the permission banner
  useEffect(() => {
    const checkPermissionBanner = () => {
      // Don't show in Electron (notifications always work)
      if ((window as any).require) {
        return;
      }

      // Don't show if notifications aren't supported
      if (!('Notification' in window)) {
        return;
      }

      // Check if user has already made a decision
      const hasSeenPermissionBanner = localStorage.getItem('notificationPermissionBannerSeen');
      
      // Show banner if permission is default and user hasn't seen banner yet
      if (Notification.permission === 'default' && !hasSeenPermissionBanner) {
        setShowPermissionBanner(true);
      }
    };

    checkPermissionBanner();
  }, []);

  // Handle permission banner actions
  const handleAllowNotifications = async () => {
    localStorage.setItem('notificationPermissionBannerSeen', 'true');
    setShowPermissionBanner(false);
    
    try {
      const permission = await notificationService.requestPermission();
      
      if (permission === 'granted') {
        // Show a success notification
        setTimeout(() => {
          notificationService.showNotification({
            title: 'Benachrichtigungen aktiviert',
            body: 'Sie erhalten jetzt Erinnerungen für Ihre Aufgaben.',
            icon: '/3d_fox.png',
            tag: 'permission-granted',
            silent: true,
            requireInteraction: false
          });
        }, 500);
      } else if (permission === 'denied') {
        // Show helpful instructions for manually enabling notifications
        showPermissionInstructions();
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  // Show instructions for manually enabling notifications
  const showPermissionInstructions = () => {
    // Get user's accent color
    const accentColor = state.preferences.accentColor || '#3b82f6';
    
    const modal = document.createElement('div');
    modal.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.4);
        backdrop-filter: blur(12px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease-out;
      ">
        <div style="
          background: white;
          border-radius: 24px;
          padding: 40px;
          max-width: 640px;
          width: 90%;
          margin: 20px;
          box-shadow: 0 25px 50px rgba(0,0,0,0.15);
          animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          position: relative;
          overflow: hidden;
        ">
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
          
          <div style="margin-bottom: 32px; display: grid; gap: 16px;">
            <div style="background: #f8fafc; padding: 20px; border-radius: 16px; border-left: 4px solid ${accentColor};">
              <h3 style="margin: 0 0 12px 0; color: #0f172a; font-size: 18px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                <span style="width: 24px; height: 24px; background: ${accentColor}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 14px; font-weight: bold;">1</span>
                Schnelle Lösung
              </h3>
              <div style="color: #475569; font-size: 15px; line-height: 1.6; margin-left: 32px;">
                <div style="margin-bottom: 8px;"><strong>Adressleiste</strong> → 🔒 Symbol klicken</div>
                <div style="margin-bottom: 8px;"><strong>Benachrichtigungen</strong> → "Zulassen" auswählen</div>
                <div><strong>Seite neu laden</strong> → F5 drücken</div>
              </div>
            </div>
            
            <div style="background: linear-gradient(135deg, ${accentColor}08, ${accentColor}05); padding: 20px; border-radius: 16px; border: 1px solid ${accentColor}20;">
              <h3 style="margin: 0 0 12px 0; color: #0f172a; font-size: 18px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                <span style="width: 24px; height: 24px; background: ${accentColor}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 14px; font-weight: bold;">2</span>
                Alternative (Chrome)
              </h3>
              <div style="color: #475569; font-size: 14px; margin-left: 32px;">
                Einstellungen → Datenschutz und Sicherheit → Website-Einstellungen → Benachrichtigungen
              </div>
            </div>
          </div>
          
          <div style="display: flex; gap: 12px; justify-content: center;">
            <button onclick="window.location.reload()" style="
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
              min-width: 160px;
            " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 25px ${accentColor}40';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px ${accentColor}40';">
              Seite neu laden
            </button>
            <button onclick="this.closest('div').remove()" style="
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
              Später
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Add CSS animations
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
    
    document.body.appendChild(modal);
    
    // Auto-close after 30 seconds
    setTimeout(() => {
      if (modal.parentNode) {
        modal.remove();
      }
      if (style.parentNode) {
        style.remove();
      }
    }, 30000);
  };

  const handleDismissBanner = () => {
    localStorage.setItem('notificationPermissionBannerSeen', 'true');
    setShowPermissionBanner(false);
  };

  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
      const today = now.toISOString().split('T')[0];

      // Find tasks with reminders that should be shown now
          const tasksWithReminders = state.tasks.filter(task => {
      if (task.completed) return false;

      // Simplified reminder system - just check reminderDate and reminderTime
      return task.reminderDate === today &&
             task.reminderTime &&
             !checkedReminders.has(`${task.id}-${task.reminderDate}-${task.reminderTime}`);
    });

      for (const task of tasksWithReminders) {
        if (task.reminderTime) {
          const [taskHour, taskMinute] = task.reminderTime.split(':').map(Number);
          const [currentHour, currentMinute] = currentTime.split(':').map(Number);
          
          // Check if current time matches reminder time (within 1 minute window)
          const taskTimeInMinutes = taskHour * 60 + taskMinute;
          const currentTimeInMinutes = currentHour * 60 + currentMinute;
          
          if (Math.abs(currentTimeInMinutes - taskTimeInMinutes) <= 1) {
            // Mark this reminder as checked to avoid duplicate notifications
            setCheckedReminders(prev => new Set([...prev, `${task.id}-${task.reminderDate}-${task.reminderTime}`]));
            
            // Show notification
            setCurrentReminder(task);
            setShowOverlay(true);
            
            // Play notification sound if enabled
            if (state.preferences.sounds) {
              const audio = new Audio('/notification-sound.mp3');
              audio.volume = state.preferences.soundVolume;
              audio.play().catch(() => {
                // Fallback: simple beep if audio file is not available
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.value = 800;
                oscillator.type = 'sine';
                gainNode.gain.value = state.preferences.soundVolume * 0.3;
                
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.3);
              });
            }
            
            // Desktop notification using our notification service
            notificationService.showTaskReminder(task, () => {
              setCurrentReminder(task);
              setShowOverlay(true);
            });
            
            break; // Show only one reminder at a time
          }
        }
      }
    };

    // Check reminders every minute
    const interval = setInterval(checkReminders, 60000);
    
    // Also check immediately
    checkReminders();

    return () => clearInterval(interval);
  }, [state.tasks, state.preferences.sounds, state.preferences.soundVolume, checkedReminders]);

  // Clear checked reminders at midnight to allow for daily reminders
  useEffect(() => {
    const checkMidnight = () => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        setCheckedReminders(new Set());
      }
    };

    const midnightInterval = setInterval(checkMidnight, 60000);
    return () => clearInterval(midnightInterval);
  }, []);

  const handleDismiss = () => {
    setShowOverlay(false);
    setCurrentReminder(null);
  };

  const handleComplete = () => {
    if (currentReminder) {
      dispatch({
        type: 'UPDATE_TASK',
        payload: { ...currentReminder, completed: true, updatedAt: new Date().toISOString() }
      });
    }
    handleDismiss();
  };

  const handleSnooze = (minutes: number) => {
    if (currentReminder) {
      // Calculate snooze time
      const now = new Date();
      const snoozeTime = new Date(now.getTime() + minutes * 60000);
      const snoozeTimeString = snoozeTime.getHours().toString().padStart(2, '0') + ':' + 
                               snoozeTime.getMinutes().toString().padStart(2, '0');
      
      // If snoozing to next day, update the date as well
      let newReminderDate = currentReminder.reminderDate;
      if (snoozeTime.toDateString() !== now.toDateString()) {
        newReminderDate = snoozeTime.toISOString().split('T')[0];
      }
      
      dispatch({
        type: 'UPDATE_TASK',
        payload: { 
          ...currentReminder, 
          reminderDate: newReminderDate,
          reminderTime: snoozeTimeString,
          updatedAt: new Date().toISOString()
        }
      });
      
      // Remove from checked reminders so it can trigger again
      setCheckedReminders(prev => {
        const newSet = new Set(prev);
        newSet.delete(`${currentReminder.id}-${currentReminder.reminderDate}-${currentReminder.reminderTime}`);
        return newSet;
      });

      // Show a brief confirmation
      notificationService.showNotification({
        title: `Erinnerung verschoben`,
        body: `"${currentReminder.title}" wurde um ${minutes} Minuten verschoben.`,
        icon: '/3d_fox.png',
        tag: 'snooze-confirmation',
        silent: true,
        requireInteraction: false
      });
    }
    handleDismiss();
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
    // Keep the overlay open so user can still interact with it
  };

  const handleCloseTaskModal = () => {
    setShowTaskModal(false);
    setSelectedTask(null);
  };

  return (
    <>
      {/* Floating permission banner */}
      {showPermissionBanner && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[10000] bg-white dark:bg-gray-900 shadow-xl rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-3">
          <Bell className="w-4 h-4 text-yellow-500" />
          <span className="text-sm text-gray-800 dark:text-gray-200">Benachrichtigungen aktivieren?</span>
          <div className="flex gap-2">
            <button onClick={handleAllowNotifications} className="px-2 py-1 rounded-md text-white text-xs" style={{ backgroundColor: state.preferences.accentColor }}>Erlauben</button>
            <button onClick={() => { localStorage.setItem('notificationPermissionBannerSeen', 'true'); setShowPermissionBanner(false); }} className="px-2 py-1 rounded-md text-xs border">Später</button>
          </div>
        </div>
      )}

      {/* Backup toast */}
      {(() => {
        try {
          const anyWin = window as any;
          if (anyWin.__taskfuchs_backup_toast__) {
            setTimeout(() => { anyWin.__taskfuchs_backup_toast__ = false; }, 10);
            return (
              <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[200000000] pointer-events-none">
                <div className="px-3 py-1.5 rounded-md text-white text-sm shadow-lg" style={{ backgroundColor: '#16a34a' }}>
                  Backup gespeichert
                </div>
              </div>
            );
          }
        } catch {}
        return null;
      })()}

      {/* Existing overlays */}
      {showOverlay && currentReminder && (
        <ReminderOverlay
          task={currentReminder}
          isVisible={true}
          onDismiss={() => setShowOverlay(false)}
          onComplete={() => setShowOverlay(false)}
          onSnooze={() => setShowOverlay(false)}
          onTaskClick={() => {
            setSelectedTask(currentReminder);
            setShowTaskModal(true);
          }}
        />
      )}

      {/* Task Modal for reminders */}
      {showTaskModal && selectedTask && (
        <TaskModal
          task={selectedTask}
          isOpen={showTaskModal}
          onClose={() => setShowTaskModal(false)}
        />
      )}
    </>
  );
} 