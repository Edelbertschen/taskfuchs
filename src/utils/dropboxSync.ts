import { encryptJson, decryptJson } from './e2ee';
import { DropboxClient } from './dropboxClient';

type Dispatch = (action: any) => void;

export async function dropboxUpload(
  state: any,
  dispatch: Dispatch,
  opts?: { folderPathOverride?: string; passphraseOverride?: string }
): Promise<boolean> {
  const prefs = state?.preferences?.dropbox || {};
  if (!prefs?.enabled) return false;
  const appKey: string = prefs.appKey || '';
  const refreshToken: string | undefined = prefs.refreshToken;
  let accessToken: string | undefined = prefs.accessToken;
  let passphrase = opts?.passphraseOverride || '';
  if (!passphrase) {
    passphrase = prefs.rememberPassphrase ? (localStorage.getItem('taskfuchs_dropbox_passphrase') || '') : '';
  }
  if (!passphrase) throw new Error('Passphrase erforderlich');

  const client = new DropboxClient(appKey, `${window.location.origin}/auth/dropbox.html`);
  if (!accessToken && refreshToken) {
    const t = await client.refreshToken(refreshToken);
    accessToken = t.access_token;
    const expiresAt = t.expires_in ? Date.now() + t.expires_in * 1000 : undefined;
    dispatch({ type: 'UPDATE_PREFERENCES', payload: { dropbox: { ...prefs, accessToken, expiresAt } } });
  }
  if (!accessToken) throw new Error('Nicht verbunden');

  // Build full export payload (same scope as JSON-Export)
  const exportPayload = {
    tasks: state.tasks,
    archivedTasks: state.archivedTasks,
    columns: state.columns,
    tags: state.tags,
    kanbanBoards: state.kanbanBoards,
    pinColumns: state.pinColumns,
    notes: state.notes?.notes ?? state.notes,
    noteLinks: state.noteLinks,
    preferences: state.preferences,
    viewState: state.viewState,
    projectKanbanColumns: state.viewState?.projectKanban?.columns,
    projectKanbanState: state.viewState?.projectKanban,
    events: state.events,
    calendarSources: state.calendarSources,
    imageStorage: state.imageStorage,
    searchQuery: state.searchQuery,
    activeTagFilters: state.activeTagFilters,
    activePriorityFilters: state.activePriorityFilters,
    focusMode: state.focusMode,
    focusedColumnId: state.focusedColumnId,
    showCompletedTasks: state.showCompletedTasks,
    projectColumnOffset: state.projectColumnOffset,
    notifications: state.notifications,
    activeTimer: state.activeTimer,
    currentDate: state.currentDate,
    isNoteEditorFullScreen: state.isNoteEditorFullScreen,
    recurrence: state.recurrence,
    personalCapacity: state.personalCapacity,
    exportDate: new Date().toISOString(),
    version: '2.3'
  } as any;

  const encrypted = await encryptJson(exportPayload, passphrase);
  const folder = opts?.folderPathOverride || prefs.folderPath || '/Apps/TaskFuchs';
  const filePath = `${folder}/state.enc`;
  let rev: string | undefined;
  try {
    const existing = await client.downloadEncrypted(accessToken, filePath);
    if (existing) rev = existing.rev;
  } catch {}

  // If a different remote exists (rev mismatch on update), caller should handle. Here we just try update or add.
  await client.uploadEncrypted(accessToken, filePath, encrypted.data, rev);

  if (opts?.passphraseOverride && prefs.rememberPassphrase) {
    try { localStorage.setItem('taskfuchs_dropbox_passphrase', opts.passphraseOverride); } catch {}
  }

  dispatch({ type: 'UPDATE_PREFERENCES', payload: { dropbox: {
    ...prefs,
    folderPath: folder,
    lastSync: new Date().toISOString(),
    lastSyncStatus: 'success',
    lastSyncError: undefined,
  } } });
  return true;
}

export async function dropboxDownload(
  state: any,
  dispatch: Dispatch,
  strategy: 'remote' | 'local' | 'manual' = 'remote',
  opts?: { folderPathOverride?: string; passphraseOverride?: string }
): Promise<boolean> {
  const prefs = state?.preferences?.dropbox || {};
  if (!prefs?.enabled) return false;
  const appKey: string = prefs.appKey || '';
  const refreshToken: string | undefined = prefs.refreshToken;
  let accessToken: string | undefined = prefs.accessToken;
  let passphrase = opts?.passphraseOverride || '';
  if (!passphrase) {
    passphrase = prefs.rememberPassphrase ? (localStorage.getItem('taskfuchs_dropbox_passphrase') || '') : '';
  }
  if (!passphrase) throw new Error('Passphrase erforderlich');

  const client = new DropboxClient(appKey, `${window.location.origin}/auth/dropbox.html`);
  if (!accessToken && refreshToken) {
    const t = await client.refreshToken(refreshToken);
    accessToken = t.access_token;
    const expiresAt = t.expires_in ? Date.now() + t.expires_in * 1000 : undefined;
    dispatch({ type: 'UPDATE_PREFERENCES', payload: { dropbox: { ...prefs, accessToken, expiresAt } } });
  }
  if (!accessToken) throw new Error('Nicht verbunden');

  const folder = opts?.folderPathOverride || prefs.folderPath || '/Apps/TaskFuchs';
  const filePath = `${folder}/state.enc`;
  const existing = await client.downloadEncrypted(accessToken, filePath);
  if (!existing) throw new Error(`Keine Sicherung gefunden in "${folder}"`);

  let remoteState: any;
  try {
    remoteState = await decryptJson<any>({ data: existing.contentB64 }, passphrase);
  } catch (e) {
    throw new Error('Entschlüsselung fehlgeschlagen: Passphrase prüfen');
  }

  // Hot-apply to in-memory state via dispatch
  try {
    if (Array.isArray(remoteState.tasks)) dispatch({ type: 'SET_TASKS', payload: remoteState.tasks });
    if (Array.isArray(remoteState.archivedTasks)) dispatch({ type: 'SET_ARCHIVED_TASKS', payload: remoteState.archivedTasks });
    if (Array.isArray(remoteState.columns)) dispatch({ type: 'SET_COLUMNS', payload: remoteState.columns });
    if (Array.isArray(remoteState.tags)) dispatch({ type: 'SET_TAGS', payload: remoteState.tags });
    if (Array.isArray(remoteState.kanbanBoards)) dispatch({ type: 'SET_KANBAN_BOARDS', payload: remoteState.kanbanBoards });
    if (remoteState.notes && Array.isArray(remoteState.notes)) dispatch({ type: 'SET_NOTES', payload: remoteState.notes });
    if (remoteState.viewState) dispatch({ type: 'SET_VIEW_STATE', payload: remoteState.viewState });
    if (remoteState.calendarSources) dispatch({ type: 'SET_CALENDAR_SOURCES', payload: remoteState.calendarSources });
    if (remoteState.preferences) {
      const prefsPayload = { ...remoteState.preferences };
      // Never override local Dropbox credentials/settings on pull
      if (prefsPayload.dropbox) delete (prefsPayload as any).dropbox;
      dispatch({ type: 'UPDATE_PREFERENCES', payload: prefsPayload });
      // Force theme application after updating preferences
      try {
        const root = document.documentElement;
        if (prefsPayload.theme === 'dark') root.classList.add('dark');
        else if (prefsPayload.theme === 'light') root.classList.remove('dark');
        else {
          if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) root.classList.add('dark');
          else root.classList.remove('dark');
        }
      } catch {}
    }
  } catch {}

  if (strategy === 'local') return false;

  // Map relevant keys to localStorage and reload
  const map: Array<[string, any]> = [
    ['taskfuchs-tasks', remoteState.tasks],
    ['taskfuchs-archived-tasks', remoteState.archivedTasks],
    ['taskfuchs-columns', remoteState.columns],
    ['taskfuchs-tags', remoteState.tags],
    ['taskfuchs-boards', remoteState.kanbanBoards],
    ['taskfuchs-notes', remoteState.notes?.notes || remoteState.notes],
    ['taskfuchs-note-links', remoteState.noteLinks],
    ['taskfuchs-preferences', remoteState.preferences],
    ['taskfuchs-view-state', remoteState.viewState],
    ['taskfuchs-events', remoteState.events],
    ['taskfuchs-calendar-sources', remoteState.calendarSources],
  ];
  for (const [key, val] of map) {
    try {
      if (typeof val !== 'undefined') localStorage.setItem(key, JSON.stringify(val));
    } catch {}
  }

  dispatch({ type: 'UPDATE_PREFERENCES', payload: { dropbox: {
    ...prefs,
    folderPath: folder,
    lastSync: new Date().toISOString(),
    lastSyncStatus: 'success',
    lastSyncError: undefined,
  } } });
  return true;
}

// Pull -> Push combined sync with simple optimistic conflict handling
export async function dropboxBiSync(
  state: any,
  dispatch: Dispatch,
  opts: { folderPath: string; passphrase: string; prefer?: 'local' | 'remote' }
): Promise<{ pulled: boolean; pushed: boolean }> {
  const result = { pulled: false, pushed: false };
  // 1) Pull
  try {
    await dropboxDownload(state, dispatch, opts.prefer === 'local' ? 'local' : 'remote', {
      folderPathOverride: opts.folderPath,
      passphraseOverride: opts.passphrase,
    });
    result.pulled = true;
  } catch (e) {
    // If not found, continue with push only
  }
  // 2) Push (will compute new rev internally)
  await dropboxUpload(state, dispatch, {
    folderPathOverride: opts.folderPath,
    passphraseOverride: opts.passphrase,
  });
  result.pushed = true;
  return result;
}

export async function dropboxReset(state: any, dispatch: Dispatch): Promise<void> {
  const prefs = state?.preferences?.dropbox || {};
  const appKey: string = prefs.appKey || '';
  const refreshToken: string | undefined = prefs.refreshToken;
  let accessToken: string | undefined = prefs.accessToken;
  const client = new DropboxClient(appKey, `${window.location.origin}/auth/dropbox.html`);
  if (!accessToken && refreshToken) {
    const t = await client.refreshToken(refreshToken);
    accessToken = t.access_token;
  }
  // Best effort: delete remote state file
  try {
    if (accessToken) {
      const primary = `${prefs.folderPath || '/Apps/TaskFuchs'}/state.enc`;
      await client.deleteFile(accessToken, primary).catch(() => {});
      // Also try default path to be safe
      if (prefs.folderPath && prefs.folderPath !== '/Apps/TaskFuchs') {
        await client.deleteFile(accessToken, `/Apps/TaskFuchs/state.enc`).catch(() => {});
      }
    }
  } catch {}
  // Clear local tokens and prefs
  const cleared = {
    enabled: false,
    appKey: '',
    accessToken: undefined,
    refreshToken: undefined,
    expiresAt: undefined,
    accountEmail: '',
    accountName: '',
    folderPath: '',
    autoSync: true,
    syncInterval: 30,
    lastSync: undefined,
    lastSyncStatus: undefined,
    lastSyncError: undefined,
    conflictResolution: 'manual',
    rememberPassphrase: false,
    passphraseHint: ''
  };
  try { localStorage.removeItem('taskfuchs_dropbox_passphrase'); } catch {}
  dispatch({ type: 'UPDATE_PREFERENCES', payload: { dropbox: cleared } });
}

// Local-only reset: keep any remote files, but clear all local Dropbox settings
export function dropboxResetLocal(dispatch: Dispatch): void {
  try { localStorage.removeItem('taskfuchs_dropbox_passphrase'); } catch {}
  const cleared = {
    enabled: false,
    appKey: '',
    accessToken: undefined,
    refreshToken: undefined,
    expiresAt: undefined,
    accountEmail: '',
    accountName: '',
    folderPath: '',
    autoSync: true,
    syncInterval: 30,
    lastSync: undefined,
    lastSyncStatus: undefined,
    lastSyncError: undefined,
    conflictResolution: 'manual',
    rememberPassphrase: false,
    passphraseHint: ''
  };
  dispatch({ type: 'UPDATE_PREFERENCES', payload: { dropbox: cleared } });
}


