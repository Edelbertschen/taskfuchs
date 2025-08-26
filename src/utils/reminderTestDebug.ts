import type { Task, TaskReminder } from '../types';

export class ReminderSystemDebugger {
  /**
   * Test the flexible reminder system
   */
  static testFlexibleReminders() {
    console.log('🔔 === TESTING FLEXIBLE REMINDER SYSTEM ===');
    
    // Create test task with multiple reminders
    const testTask: Partial<Task> = {
      id: 'test-task-123',
      title: 'Test Task mit mehreren Erinnerungen',
      reminders: [
        {
          id: 'reminder-1',
          date: '2025-01-10',
          time: '09:00',
          message: 'Morgendliche Erinnerung',
          type: 'manual',
          dismissed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'reminder-2', 
          date: '2025-01-10',
          time: '14:30',
          message: 'Nachmittags-Erinnerung',
          type: 'todoist',
          dismissed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'reminder-3',
          date: '2025-01-12',
          time: '18:00',
          message: 'Abends in 2 Tagen',
          type: 'auto',
          dismissed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
    };
    
    console.log('📝 Test Task erstellt:', testTask);
    console.log('⏰ Anzahl Erinnerungen:', testTask.reminders?.length);
    
    // Test reminder filtering for today
    const today = new Date().toISOString().split('T')[0];
    const todayReminders = testTask.reminders?.filter(r => 
      !r.dismissed && r.date === today
    );
    
    console.log(`📅 Erinnerungen für heute (${today}):`, todayReminders?.length || 0);
    todayReminders?.forEach(r => {
      console.log(`  - ${r.time}: ${r.message} (${r.type})`);
    });
    
    // Test reminder checking logic
    const currentTime = new Date();
    const currentTimeStr = `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`;
    
    console.log(`🕐 Aktuelle Zeit: ${currentTimeStr}`);
    
    // Check which reminders should trigger now
    const triggerableReminders = testTask.reminders?.filter(r => {
      if (r.dismissed || r.date !== today) return false;
      
      const [reminderHour, reminderMinute] = r.time.split(':').map(Number);
      const [currentHour, currentMinute] = currentTimeStr.split(':').map(Number);
      
      const reminderTimeInMinutes = reminderHour * 60 + reminderMinute;
      const currentTimeInMinutes = currentHour * 60 + currentMinute;
      
      return Math.abs(currentTimeInMinutes - reminderTimeInMinutes) <= 1;
    });
    
    console.log('🚨 Jetzt triggerbare Erinnerungen:', triggerableReminders?.length || 0);
    
    return testTask;
  }
  
  /**
   * Test Todoist time extraction
   */
  static testTodoistTimeExtraction() {
    console.log('\n🔄 === TESTING TODOIST TIME EXTRACTION ===');
    
    const testTodoistTasks = [
      {
        id: '123',
        content: 'Meeting mit Team',
        due: {
          date: '2025-01-10',
          string: 'Jan 10 at 2:30 PM'
        }
      },
      {
        id: '124', 
        content: 'Arzttermin',
        due: {
          date: '2025-01-11',
          string: '11 Jan 14:30'
        }
      },
      {
        id: '125',
        content: 'Deadline ohne Zeit',
        due: {
          date: '2025-01-12',
          string: 'Jan 12'
        }
      }
    ];
    
    testTodoistTasks.forEach(task => {
      console.log(`\n📋 Task: ${task.content}`);
      console.log(`📅 Due String: "${task.due.string}"`);
      
      let extractedTime = '09:00'; // Default
      
      // Extract time from due.string
      if (task.due.string) {
        // Try AM/PM format
        const timeMatch = task.due.string.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1]);
          const minutes = timeMatch[2];
          const ampm = timeMatch[3].toUpperCase();
          
          if (ampm === 'PM' && hours !== 12) hours += 12;
          if (ampm === 'AM' && hours === 12) hours = 0;
          
          extractedTime = `${hours.toString().padStart(2, '0')}:${minutes}`;
        } else {
          // Try 24h format
          const time24Match = task.due.string.match(/(\d{1,2}):(\d{2})/);
          if (time24Match) {
            const hours = parseInt(time24Match[1]);
            const minutes = time24Match[2];
            if (hours >= 0 && hours <= 23) {
              extractedTime = `${hours.toString().padStart(2, '0')}:${minutes}`;
            }
          }
        }
      }
      
      console.log(`⏰ Extrahierte Zeit: ${extractedTime}`);
      
      // Create TaskFuchs reminder
      const reminder: TaskReminder = {
        id: `todoist-${task.id}-${Date.now()}`,
        date: task.due.date,
        time: extractedTime,
        message: `Erinnerung: ${task.content}`,
        type: 'todoist',
        dismissed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      console.log('✅ TaskFuchs Reminder erstellt:', reminder);
    });
  }
  
  /**
   * Test reminder notification logic
   */
  static testReminderNotificationLogic() {
    console.log('\n🔔 === TESTING REMINDER NOTIFICATION LOGIC ===');
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    // Create test reminders with different times around current time
    const testReminders: TaskReminder[] = [
      {
        id: 'test-1',
        date: today,
        time: currentTime, // Exact match
        message: 'Jetzt!',
        type: 'manual',
        dismissed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'test-2',
        date: today,
        time: `${(now.getHours()).toString().padStart(2, '0')}:${(now.getMinutes() + 1).toString().padStart(2, '0')}`, // 1 minute later
        message: 'In 1 Minute',
        type: 'manual',
        dismissed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'test-3',
        date: today,
        time: '12:00', // Different time
        message: 'Mittags',
        type: 'manual',
        dismissed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'test-4',
        date: today,
        time: currentTime,
        message: 'Dismissed reminder',
        type: 'manual',
        dismissed: true, // This should be filtered out
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    
    console.log(`📅 Heute: ${today}`);
    console.log(`🕐 Aktuelle Zeit: ${currentTime}`);
    console.log('📋 Test Reminders:', testReminders.length);
    
    // Filter triggerable reminders
    const triggerableReminders = testReminders.filter(reminder => {
      if (reminder.dismissed || reminder.date !== today) return false;
      
      const [reminderHour, reminderMinute] = reminder.time.split(':').map(Number);
      const [currentHour, currentMinute] = currentTime.split(':').map(Number);
      
      const reminderTimeInMinutes = reminderHour * 60 + reminderMinute;
      const currentTimeInMinutes = currentHour * 60 + currentMinute;
      
      const timeDiff = Math.abs(currentTimeInMinutes - reminderTimeInMinutes);
      
      console.log(`⏰ ${reminder.message}: ${reminder.time} (Diff: ${timeDiff} min)`);
      
      return timeDiff <= 1; // Within 1 minute window
    });
    
    console.log('🚨 Triggerbare Reminders:', triggerableReminders.length);
    triggerableReminders.forEach(r => {
      console.log(`  🔔 ${r.message} um ${r.time}`);
    });
  }
  
  /**
   * Run all tests
   */
  static runAllTests() {
    console.clear();
    console.log('🧪 === REMINDER SYSTEM DEBUG TESTS ===\n');
    
    this.testFlexibleReminders();
    this.testTodoistTimeExtraction();
    this.testReminderNotificationLogic();
    
    console.log('\n✅ === ALLE TESTS ABGESCHLOSSEN ===');
    console.log('💡 Das neue Erinnerungssystem unterstützt:');
    console.log('   • Mehrere Erinnerungen pro Aufgabe');
    console.log('   • Unabhängige Datums-/Zeitwahl');
    console.log('   • Todoist-Zeitsynchronisation');
    console.log('   • Schlummern und Verwerfen');
    console.log('   • Verschiedene Erinnerungstypen');
  }
}

// Make it available globally for browser console testing
if (typeof window !== 'undefined') {
  (window as any).ReminderSystemDebugger = ReminderSystemDebugger;
  console.log('🔔 ReminderSystemDebugger available globally. Run ReminderSystemDebugger.runAllTests() to test.');
} 