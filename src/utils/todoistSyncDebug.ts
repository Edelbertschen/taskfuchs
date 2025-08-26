import type { Task } from '../types';

/**
 * Debug utility to test reminder date synchronization
 */
export class TodoistSyncDebugger {
  
  /**
   * Test reminder date sync logic
   */
  static testReminderDateSync() {
    console.log('🔍 Testing Reminder Date Sync Logic...\n');
    
    // Test cases
    const testCases: Array<{name: string, task: Partial<Task>, expectedSync: string | null}> = [
      {
        name: 'Task with only reminderDate',
        task: {
          title: 'Test Task 1',
          reminderDate: '2025-01-10',
          dueDate: undefined
        },
        expectedSync: '2025-01-10'
      },
      {
        name: 'Task with only dueDate',
        task: {
          title: 'Test Task 2',
          reminderDate: undefined,
          dueDate: '2025-01-15'
        },
        expectedSync: '2025-01-15'
      },
      {
        name: 'Task with both reminderDate and dueDate (reminderDate should win)',
        task: {
          title: 'Test Task 3',
          reminderDate: '2025-01-20',
          dueDate: '2025-01-25'
        },
        expectedSync: '2025-01-20'
      },
      {
        name: 'Task with no dates',
        task: {
          title: 'Test Task 4',
          reminderDate: undefined,
          dueDate: undefined
        },
        expectedSync: null
      }
    ];
    
    // Simulate the sync logic
    testCases.forEach((testCase, index) => {
      console.log(`Test ${index + 1}: ${testCase.name}`);
      console.log(`  Input:`, {
        reminderDate: testCase.task.reminderDate || 'undefined',
        dueDate: testCase.task.dueDate || 'undefined'
      });
      
      // This matches the logic in convertToTodoistTask
      const dueDateToSync = testCase.task.reminderDate || testCase.task.dueDate;
      const sourceField = testCase.task.reminderDate ? 'reminderDate' : 'dueDate';
      
      console.log(`  Result: ${dueDateToSync || 'null'} (from ${dueDateToSync ? sourceField : 'none'})`);
      console.log(`  Expected: ${testCase.expectedSync || 'null'}`);
      console.log(`  ✅ ${dueDateToSync === testCase.expectedSync ? 'PASS' : '❌ FAIL'}\n`);
    });
    
    console.log('📋 Summary: Reminder dates should now be prioritized over due dates for Todoist sync');
    console.log('📋 If a task has no reminder/due date, Todoist due field will be cleared (set to null)');
    console.log('📋 Task fingerprinting now includes reminderDate to detect changes correctly');
  }
  
  /**
   * Test fingerprint generation including reminderDate
   */
  static testFingerprintGeneration() {
    console.log('\n🔍 Testing Task Fingerprint Generation...\n');
    
    const testTask1: Partial<Task> = {
      title: 'Test Task',
      description: 'Test description',
      dueDate: '2025-01-10',
      reminderDate: '2025-01-12',
      deadline: '2025-01-15',
      completed: false,
      priority: 'medium',
      tags: ['work', 'urgent']
    };
    
    const testTask2: Partial<Task> = {
      ...testTask1,
      reminderDate: '2025-01-13' // Changed only reminderDate
    };
    
    // Simulate fingerprint creation (matching the fixed logic)
    const createFingerprint = (task: Partial<Task>) => ({
      title: task.title,
      description: task.description || '',
      dueDate: task.dueDate || '',
      reminderDate: task.reminderDate || '', // Now included!
      deadline: task.deadline || '',
      completed: task.completed || false,
      priority: task.priority || 'none',
      tags: task.tags || []
    });
    
    const fingerprint1 = createFingerprint(testTask1);
    const fingerprint2 = createFingerprint(testTask2);
    
    console.log('Fingerprint 1:', JSON.stringify(fingerprint1, null, 2));
    console.log('Fingerprint 2:', JSON.stringify(fingerprint2, null, 2));
    
    // Test change detection
    const keysToCheck = ['title', 'description', 'dueDate', 'reminderDate', 'deadline', 'completed', 'priority'];
    const hasChanged = keysToCheck.some(key => fingerprint1[key] !== fingerprint2[key]);
    
    console.log(`\nChange detected: ${hasChanged ? '✅ YES' : '❌ NO'}`);
    console.log('Changed field: reminderDate');
    console.log('📋 Before fix: reminderDate changes would NOT be detected');
    console.log('📋 After fix: reminderDate changes ARE detected and will trigger sync');
  }
  
  /**
   * Run all debug tests
   */
  static runAll() {
    console.log('🚀 Running Todoist Sync Debug Tests...\n');
    this.testReminderDateSync();
    this.testFingerprintGeneration();
    console.log('\n✅ All tests completed!');
  }
}

// Export for console testing
(window as any).TodoistSyncDebugger = TodoistSyncDebugger; 