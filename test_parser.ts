import { parseTaskInput } from './src/utils/taskParser';

// Test cases
const testCases = [
  'Task mit ! Priorität',
  'Task mit !! Priorität',
  'Task mit !!! Priorität',
  'Task for 21.10.2025',
  'Task for heute',
  'Task for morgen',
  'Task #arbeit #privat',
  'Task 30m',
  'Task 1h',
  'Task @heute',
  'Task n This is a note',
  'Waschmaschine 20m n Waschpulver nicht vergessen #haushalt',
  'Meeting vorbereiten 1h !! @heute #arbeit',
  'Einkaufen gehen morgen #privat',
];

console.log('=== Smart Task Parser Tests ===\n');

testCases.forEach((testInput) => {
  const result = parseTaskInput(testInput);
  console.log(`📝 Input: "${testInput}"`);
  console.log(`   Title: "${result.task?.title}"`);
  if (result.task?.priority) console.log(`   Priority: ${result.task.priority}`);
  if (result.task?.estimatedTime) console.log(`   Time: ${result.task.estimatedTime}m`);
  if (result.task?.dueDate) console.log(`   Due: ${result.task.dueDate}`);
  if (result.task?.tags?.length) console.log(`   Tags: ${result.task.tags.join(', ')}`);
  if (result.task?.columnId) console.log(`   Column: ${result.task.columnId}`);
  if (result.task?.description) console.log(`   Description: "${result.task.description}"`);
  if (result.errors.length) console.log(`   ❌ Errors: ${result.errors.join('; ')}`);
  console.log('');
});
