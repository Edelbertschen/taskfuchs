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


