/**
 * Data Service - Abstraction layer for data operations
 * Supports both localStorage (Guest mode) and API (Online mode)
 */

import type { Task, Column, Tag, Note, UserPreferences } from '../types';
import * as api from './apiService';

// Storage keys for localStorage
const STORAGE_KEYS = {
  tasks: 'taskfuchs-tasks',
  archivedTasks: 'taskfuchs-archived-tasks',
  columns: 'taskfuchs-columns',
  tags: 'taskfuchs-tags',
  notes: 'taskfuchs-notes',
  pinColumns: 'taskfuchs-pin-columns',
  preferences: 'taskfuchs-preferences',
  viewState: 'taskfuchs-view-state',
  calendarSources: 'taskfuchs-calendar-sources',
  events: 'taskfuchs-events',
  boards: 'taskfuchs-boards',
  showCompleted: 'taskfuchs-show-completed'
} as const;

// Check if we're in online mode
export function isOnlineMode(): boolean {
  return !!sessionStorage.getItem('taskfuchs_jwt');
}

// ==================
// localStorage helpers
// ==================

function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setToStorage<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// ==================
// Tasks
// ==================

export async function getTasks(): Promise<Task[]> {
  if (isOnlineMode()) {
    const { tasks } = await api.tasksAPI.getAll();
    return tasks;
  }
  return getFromStorage<Task[]>(STORAGE_KEYS.tasks, []);
}

export async function getArchivedTasks(): Promise<Task[]> {
  if (isOnlineMode()) {
    const { tasks } = await api.tasksAPI.getArchived();
    return tasks;
  }
  return getFromStorage<Task[]>(STORAGE_KEYS.archivedTasks, []);
}

export async function saveTasks(tasks: Task[]): Promise<void> {
  if (isOnlineMode()) {
    // In online mode, sync only when explicitly requested
    // Individual task updates go through the API
    return;
  }
  setToStorage(STORAGE_KEYS.tasks, tasks);
}

export async function saveArchivedTasks(tasks: Task[]): Promise<void> {
  if (isOnlineMode()) {
    return;
  }
  setToStorage(STORAGE_KEYS.archivedTasks, tasks);
}

export async function createTask(task: Task): Promise<Task> {
  if (isOnlineMode()) {
    const { task: created } = await api.tasksAPI.create({
      ...task,
      externalId: task.id
    });
    return { ...task, id: created.id };
  }
  const tasks = getFromStorage<Task[]>(STORAGE_KEYS.tasks, []);
  tasks.push(task);
  setToStorage(STORAGE_KEYS.tasks, tasks);
  return task;
}

export async function updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
  if (isOnlineMode()) {
    await api.tasksAPI.update(taskId, updates);
    return;
  }
  const tasks = getFromStorage<Task[]>(STORAGE_KEYS.tasks, []);
  const index = tasks.findIndex(t => t.id === taskId);
  if (index !== -1) {
    tasks[index] = { ...tasks[index], ...updates };
    setToStorage(STORAGE_KEYS.tasks, tasks);
  }
}

export async function deleteTask(taskId: string): Promise<void> {
  if (isOnlineMode()) {
    await api.tasksAPI.delete(taskId);
    return;
  }
  const tasks = getFromStorage<Task[]>(STORAGE_KEYS.tasks, []);
  setToStorage(STORAGE_KEYS.tasks, tasks.filter(t => t.id !== taskId));
}

export async function archiveTask(taskId: string): Promise<void> {
  if (isOnlineMode()) {
    await api.tasksAPI.archive(taskId);
    return;
  }
  const tasks = getFromStorage<Task[]>(STORAGE_KEYS.tasks, []);
  const archived = getFromStorage<Task[]>(STORAGE_KEYS.archivedTasks, []);
  const task = tasks.find(t => t.id === taskId);
  if (task) {
    archived.push({ ...task, archived: true });
    setToStorage(STORAGE_KEYS.archivedTasks, archived);
    setToStorage(STORAGE_KEYS.tasks, tasks.filter(t => t.id !== taskId));
  }
}

export async function restoreTask(taskId: string): Promise<void> {
  if (isOnlineMode()) {
    await api.tasksAPI.restore(taskId);
    return;
  }
  const tasks = getFromStorage<Task[]>(STORAGE_KEYS.tasks, []);
  const archived = getFromStorage<Task[]>(STORAGE_KEYS.archivedTasks, []);
  const task = archived.find(t => t.id === taskId);
  if (task) {
    tasks.push({ ...task, archived: false });
    setToStorage(STORAGE_KEYS.tasks, tasks);
    setToStorage(STORAGE_KEYS.archivedTasks, archived.filter(t => t.id !== taskId));
  }
}

// ==================
// Columns
// ==================

export async function getColumns(): Promise<Column[]> {
  if (isOnlineMode()) {
    const { columns } = await api.columnsAPI.getAll();
    return columns;
  }
  return getFromStorage<Column[]>(STORAGE_KEYS.columns, []);
}

export async function saveColumns(columns: Column[]): Promise<void> {
  if (isOnlineMode()) {
    return;
  }
  setToStorage(STORAGE_KEYS.columns, columns);
}

export async function createColumn(column: Column): Promise<Column> {
  if (isOnlineMode()) {
    const { column: created } = await api.columnsAPI.create({
      ...column,
      externalId: column.id
    });
    return { ...column, id: created.id };
  }
  const columns = getFromStorage<Column[]>(STORAGE_KEYS.columns, []);
  columns.push(column);
  setToStorage(STORAGE_KEYS.columns, columns);
  return column;
}

export async function updateColumn(columnId: string, updates: Partial<Column>): Promise<void> {
  if (isOnlineMode()) {
    await api.columnsAPI.update(columnId, updates);
    return;
  }
  const columns = getFromStorage<Column[]>(STORAGE_KEYS.columns, []);
  const index = columns.findIndex(c => c.id === columnId);
  if (index !== -1) {
    columns[index] = { ...columns[index], ...updates };
    setToStorage(STORAGE_KEYS.columns, columns);
  }
}

export async function deleteColumn(columnId: string): Promise<void> {
  if (isOnlineMode()) {
    await api.columnsAPI.delete(columnId);
    return;
  }
  const columns = getFromStorage<Column[]>(STORAGE_KEYS.columns, []);
  setToStorage(STORAGE_KEYS.columns, columns.filter(c => c.id !== columnId));
}

// ==================
// Tags
// ==================

export async function getTags(): Promise<Tag[]> {
  if (isOnlineMode()) {
    const { tags } = await api.tagsAPI.getAll();
    return tags;
  }
  return getFromStorage<Tag[]>(STORAGE_KEYS.tags, []);
}

export async function saveTags(tags: Tag[]): Promise<void> {
  if (isOnlineMode()) {
    return;
  }
  setToStorage(STORAGE_KEYS.tags, tags);
}

export async function createTag(tag: Tag): Promise<Tag> {
  if (isOnlineMode()) {
    const { tag: created } = await api.tagsAPI.create({
      ...tag,
      externalId: tag.id
    });
    return { ...tag, id: created.id };
  }
  const tags = getFromStorage<Tag[]>(STORAGE_KEYS.tags, []);
  tags.push(tag);
  setToStorage(STORAGE_KEYS.tags, tags);
  return tag;
}

export async function deleteTag(tagId: string): Promise<void> {
  if (isOnlineMode()) {
    await api.tagsAPI.delete(tagId);
    return;
  }
  const tags = getFromStorage<Tag[]>(STORAGE_KEYS.tags, []);
  setToStorage(STORAGE_KEYS.tags, tags.filter(t => t.id !== tagId));
}

// ==================
// Notes
// ==================

export async function getNotes(): Promise<Note[]> {
  if (isOnlineMode()) {
    const { notes } = await api.notesAPI.getAll();
    return notes;
  }
  return getFromStorage<Note[]>(STORAGE_KEYS.notes, []);
}

export async function saveNotes(notes: Note[]): Promise<void> {
  if (isOnlineMode()) {
    return;
  }
  setToStorage(STORAGE_KEYS.notes, notes);
}

export async function createNote(note: Note): Promise<Note> {
  if (isOnlineMode()) {
    const { note: created } = await api.notesAPI.create({
      ...note,
      externalId: note.id
    });
    return { ...note, id: created.id };
  }
  const notes = getFromStorage<Note[]>(STORAGE_KEYS.notes, []);
  notes.push(note);
  setToStorage(STORAGE_KEYS.notes, notes);
  return note;
}

export async function updateNote(noteId: string, updates: Partial<Note>): Promise<void> {
  if (isOnlineMode()) {
    await api.notesAPI.update(noteId, updates);
    return;
  }
  const notes = getFromStorage<Note[]>(STORAGE_KEYS.notes, []);
  const index = notes.findIndex(n => n.id === noteId);
  if (index !== -1) {
    notes[index] = { ...notes[index], ...updates };
    setToStorage(STORAGE_KEYS.notes, notes);
  }
}

export async function deleteNote(noteId: string): Promise<void> {
  if (isOnlineMode()) {
    await api.notesAPI.delete(noteId);
    return;
  }
  const notes = getFromStorage<Note[]>(STORAGE_KEYS.notes, []);
  setToStorage(STORAGE_KEYS.notes, notes.filter(n => n.id !== noteId));
}

// ==================
// Pin Columns
// ==================

export async function getPinColumns(): Promise<any[]> {
  if (isOnlineMode()) {
    const { pinColumns } = await api.pinColumnsAPI.getAll();
    return pinColumns;
  }
  return getFromStorage<any[]>(STORAGE_KEYS.pinColumns, []);
}

export async function savePinColumns(pinColumns: any[]): Promise<void> {
  if (isOnlineMode()) {
    return;
  }
  setToStorage(STORAGE_KEYS.pinColumns, pinColumns);
}

// ==================
// Preferences
// ==================

export async function getPreferences(): Promise<UserPreferences | null> {
  if (isOnlineMode()) {
    const { preferences } = await api.preferencesAPI.get();
    return preferences;
  }
  return getFromStorage<UserPreferences | null>(STORAGE_KEYS.preferences, null);
}

export async function savePreferences(preferences: UserPreferences): Promise<void> {
  if (isOnlineMode()) {
    await api.preferencesAPI.update(preferences);
    return;
  }
  setToStorage(STORAGE_KEYS.preferences, preferences);
}

export async function updatePreferences(updates: Partial<UserPreferences>): Promise<void> {
  if (isOnlineMode()) {
    await api.preferencesAPI.patch(updates);
    return;
  }
  const current = getFromStorage<UserPreferences | null>(STORAGE_KEYS.preferences, null);
  if (current) {
    setToStorage(STORAGE_KEYS.preferences, { ...current, ...updates });
  }
}

// ==================
// View State
// ==================

export async function getViewState(): Promise<any> {
  if (isOnlineMode()) {
    const { state } = await api.viewStateAPI.get();
    return state;
  }
  return getFromStorage<any>(STORAGE_KEYS.viewState, {});
}

export async function saveViewState(state: any): Promise<void> {
  if (isOnlineMode()) {
    await api.viewStateAPI.update(state);
    return;
  }
  setToStorage(STORAGE_KEYS.viewState, state);
}

// ==================
// Calendar
// ==================

export async function getCalendarSources(): Promise<any[]> {
  if (isOnlineMode()) {
    const { sources } = await api.calendarAPI.getSources();
    return sources;
  }
  return getFromStorage<any[]>(STORAGE_KEYS.calendarSources, []);
}

export async function saveCalendarSources(sources: any[]): Promise<void> {
  if (isOnlineMode()) {
    return;
  }
  setToStorage(STORAGE_KEYS.calendarSources, sources);
}

export async function getCalendarEvents(): Promise<any[]> {
  if (isOnlineMode()) {
    const { events } = await api.calendarAPI.getEvents();
    return events;
  }
  return getFromStorage<any[]>(STORAGE_KEYS.events, []);
}

export async function saveCalendarEvents(events: any[]): Promise<void> {
  if (isOnlineMode()) {
    return;
  }
  setToStorage(STORAGE_KEYS.events, events);
}

// ==================
// Full Sync (for migrating guest to online)
// ==================

export async function migrateToOnline(): Promise<void> {
  if (!isOnlineMode()) {
    throw new Error('Must be logged in to migrate');
  }

  // Gather all local data
  const data = {
    tasks: getFromStorage<Task[]>(STORAGE_KEYS.tasks, []),
    archivedTasks: getFromStorage<Task[]>(STORAGE_KEYS.archivedTasks, []),
    columns: getFromStorage<Column[]>(STORAGE_KEYS.columns, []),
    tags: getFromStorage<Tag[]>(STORAGE_KEYS.tags, []),
    pinColumns: getFromStorage<any[]>(STORAGE_KEYS.pinColumns, []),
    notes: getFromStorage<Note[]>(STORAGE_KEYS.notes, []),
    preferences: getFromStorage<any>(STORAGE_KEYS.preferences, null),
    viewState: getFromStorage<any>(STORAGE_KEYS.viewState, null),
    calendarSources: getFromStorage<any[]>(STORAGE_KEYS.calendarSources, []),
    events: getFromStorage<any[]>(STORAGE_KEYS.events, [])
  };

  // Send to server
  await api.syncAPI.fullSync(data);
}

export async function fetchFullData(): Promise<{
  tasks: Task[];
  archivedTasks: Task[];
  columns: Column[];
  tags: Tag[];
  pinColumns: any[];
  notes: Note[];
  preferences: UserPreferences;
  viewState: any;
  calendarSources: any[];
  events: any[];
}> {
  if (!isOnlineMode()) {
    return {
      tasks: getFromStorage<Task[]>(STORAGE_KEYS.tasks, []),
      archivedTasks: getFromStorage<Task[]>(STORAGE_KEYS.archivedTasks, []),
      columns: getFromStorage<Column[]>(STORAGE_KEYS.columns, []),
      tags: getFromStorage<Tag[]>(STORAGE_KEYS.tags, []),
      pinColumns: getFromStorage<any[]>(STORAGE_KEYS.pinColumns, []),
      notes: getFromStorage<Note[]>(STORAGE_KEYS.notes, []),
      preferences: getFromStorage<any>(STORAGE_KEYS.preferences, {}),
      viewState: getFromStorage<any>(STORAGE_KEYS.viewState, {}),
      calendarSources: getFromStorage<any[]>(STORAGE_KEYS.calendarSources, []),
      events: getFromStorage<any[]>(STORAGE_KEYS.events, [])
    };
  }

  const data = await api.syncAPI.getFullData();
  return data;
}

