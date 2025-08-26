import { supabase } from '../lib/supabaseClient';

const BUCKET = 'taskfuchs-backups';

function readJson<T = any>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export async function uploadInitialBackupIfNeeded(userId: string): Promise<boolean> {
  const flagKey = `taskfuchs-initial-upload-done-${userId}`;
  if (localStorage.getItem(flagKey) === 'true') return false;

  // Collect current local data snapshot
  const snapshot = {
    createdAt: new Date().toISOString(),
    version: '1',
    tasks: readJson('taskfuchs-tasks') || [],
    archivedTasks: readJson('taskfuchs-archived-tasks') || [],
    boards: readJson('taskfuchs-boards') || [],
    columns: readJson('taskfuchs-columns') || [],
    tags: readJson('taskfuchs-tags') || [],
    notes: readJson('taskfuchs-notes') || [],
    noteLinks: readJson('taskfuchs-note-links') || [],
    preferences: readJson('taskfuchs-preferences') || {},
    viewState: readJson('taskfuchs-view-state') || {},
    events: readJson('taskfuchs-events') || [],
    calendarSources: readJson('taskfuchs-calendar-sources') || [],
    showCompleted: readJson('taskfuchs-show-completed') ?? true,
  };

  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const path = `${userId}/initial-backup.json`;

  // Try to upload only if not exists
  if (!supabase) return false;
  const { data: existing } = await supabase.storage.from(BUCKET).list(userId, { search: 'initial-backup.json' });
  if (existing && existing.find((f) => f.name === 'initial-backup.json')) {
    localStorage.setItem(flagKey, 'true');
    return false;
  }

  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: 'application/json',
    upsert: false,
  });
  if (!error) {
    localStorage.setItem(flagKey, 'true');
    return true;
  }
  // If the file already exists, mark as done to avoid retry loops
  if ((error as any)?.statusCode === '409' || /exists/i.test(error.message)) {
    localStorage.setItem(flagKey, 'true');
    return false;
  }
  throw error;
}

export async function tryRestoreFromBackup(userId: string): Promise<boolean> {
  if (!supabase) return false;
  const flagKey = `taskfuchs-initial-restore-done-${userId}`;
  if (localStorage.getItem(flagKey) === 'true') return false;

  // Only restore if there are no local tasks yet (new device/browser)
  const hasLocal = !!localStorage.getItem('taskfuchs-tasks');
  if (hasLocal) return false;

  const path = `${userId}/initial-backup.json`;
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) return false;

  try {
    const text = await data.text();
    const snapshot = JSON.parse(text);
    // Write back to localStorage using the same keys the app reads
    if (snapshot.tasks) localStorage.setItem('taskfuchs-tasks', JSON.stringify(snapshot.tasks));
    if (snapshot.archivedTasks) localStorage.setItem('taskfuchs-archived-tasks', JSON.stringify(snapshot.archivedTasks));
    if (snapshot.boards) localStorage.setItem('taskfuchs-boards', JSON.stringify(snapshot.boards));
    if (snapshot.columns) localStorage.setItem('taskfuchs-columns', JSON.stringify(snapshot.columns));
    if (snapshot.tags) localStorage.setItem('taskfuchs-tags', JSON.stringify(snapshot.tags));
    if (snapshot.notes) localStorage.setItem('taskfuchs-notes', JSON.stringify(snapshot.notes));
    if (snapshot.noteLinks) localStorage.setItem('taskfuchs-note-links', JSON.stringify(snapshot.noteLinks));
    if (snapshot.preferences) localStorage.setItem('taskfuchs-preferences', JSON.stringify(snapshot.preferences));
    if (snapshot.viewState) localStorage.setItem('taskfuchs-view-state', JSON.stringify(snapshot.viewState));
    if (snapshot.events) localStorage.setItem('taskfuchs-events', JSON.stringify(snapshot.events));
    if (snapshot.calendarSources) localStorage.setItem('taskfuchs-calendar-sources', JSON.stringify(snapshot.calendarSources));
    if (typeof snapshot.showCompleted !== 'undefined') localStorage.setItem('taskfuchs-show-completed', JSON.stringify(snapshot.showCompleted));
    localStorage.setItem(flagKey, 'true');
    return true;
  } catch {
    return false;
  }
}


