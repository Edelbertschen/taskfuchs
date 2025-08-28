import type { Task, Tag, KanbanBoard, UserPreferences, Note, NoteLink, PinColumn } from '../types';
import { format } from 'date-fns';
import { parseTaskInput } from './taskParser';

// =====================
// EXPORT FUNCTIONS
// =====================

export interface ExportData {
  tasks: Task[];
  tags: Tag[];
  boards: KanbanBoard[];
  notes?: Note[];
  noteLinks?: NoteLink[];
  preferences?: UserPreferences;
  // Additional data fields for complete export
  viewState?: any; // Current view mode and settings
  columns?: any; // Column configurations
  statistics?: any; // User statistics
  timerState?: any; // Active timer state
  syncConfig?: any; // Sync configurations
  userProfile?: any; // User profile data
  appSettings?: any; // App-specific settings
  customFields?: any; // Any custom fields
  // Project Kanban settings
  projectKanbanColumns?: any; // Project-specific Kanban columns
  projectKanbanState?: any; // Project Kanban view state
  
  // Vollständige App-Daten (Version 2.0+)
  archivedTasks?: Task[];
  kanbanBoards?: KanbanBoard[];
  notesState?: any; // Notes view state
  imageStorage?: any; // Image storage state
  searchQuery?: string;
  activeTagFilters?: string[];
  activePriorityFilters?: string[];
  focusMode?: boolean;
  focusedColumnId?: string | null;
  showCompletedTasks?: boolean;
  projectColumnOffset?: number;
  notifications?: any[];
  
  // iCal/Kalender-Daten
  events?: any[];
  calendarSources?: any[];
  
  // Timer und Statusdaten
  activeTimer?: any; // Active timer context
  currentDate?: string; // Current date as ISO string
  isNoteEditorFullScreen?: boolean; // Note editor fullscreen state
  recurrence?: any; // Recurrence rules state
  
  // 🎯 NEUE FEATURES (Version 2.2+)
  pinColumns?: PinColumn[]; // Pin-Spalten System
  emailMode?: boolean; // E-Mail-Modus in Notes
  notesViewState?: {
    selectedNote?: string | null;
    isEditing?: boolean;
    searchQuery?: string;
    selectedTags?: string[];
    view?: 'grid' | 'list';
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    showArchived?: boolean;
    showLinkPreviews?: boolean;
    editorMode?: 'markdown' | 'wysiwyg' | 'split';
    dailyNotesMode?: boolean;
    emailMode?: boolean;
    selectedDailyNoteDate?: string | null;
  };
  
  // 🔗 INTEGRATION SETTINGS - Explizite Integration-Konfigurationen
  integrations?: {
    microsoftTodo?: {
      enabled: boolean;
      selectedListId?: string;
      selectedListName?: string;
      autoSync?: boolean;
      syncInterval?: number;
      syncOnStart?: boolean;
      syncOnTaskChange?: boolean;
      bidirectionalSync?: boolean;
      conflictResolution?: string;
      lastSync?: string;
      lastSyncStatus?: string;
      lastSyncError?: string;
    };
    toggl?: {
      enabled: boolean;
      apiToken?: string; // Wird verschlüsselt/anonymisiert exportiert
      workspaceId?: string;
      defaultProjectId?: string;
      autoSync?: boolean;
      syncOnStart?: boolean;
      syncOnPause?: boolean;
      syncOnStop?: boolean;
      createProjectsAutomatically?: boolean;
      useTaskDescriptions?: boolean;
      roundTimeToMinutes?: boolean;
    };
    caldav?: {
      enabled: boolean;
      serverUrl?: string;
      username?: string;
      calendarUrl?: string;
      autoSync?: boolean;
      syncInterval?: number;
      syncOnStart?: boolean;
      syncOnTaskChange?: boolean;
      syncOnlyCompleted?: boolean;
      bidirectionalSync?: boolean;
      lastSync?: string;
      lastSyncStatus?: string;
      lastSyncError?: string;
      conflictResolution?: string;
    };
    nextcloud?: {
      enabled: boolean;
      serverUrl?: string;
      username?: string;
      syncFolder?: string;
      autoSync?: boolean;
      syncInterval?: number;
      lastSync?: string;
      totalSyncs?: number;
    };
    dropbox?: {
      enabled: boolean;
      appKey?: string;
      accountEmail?: string;
      accountName?: string;
      folderPath?: string;
      autoSync?: boolean;
      syncInterval?: number;
      lastSync?: string;
      lastSyncStatus?: string;
      passphraseHint?: string;
    };
  };
  
  metadata?: {
    totalTasks: number;
    totalNotes: number;
    totalTags: number;
    totalBoards: number;
    dataSize: number;
    exportTime: number;
    // Zusätzliche Metadaten für vollständigen Export
    totalArchivedTasks?: number;
    totalDailyNotes?: number;
    totalColumns?: number;
    totalNoteLinks?: number;
    totalImages?: number;
    totalNotifications?: number;
    totalEvents?: number;
    totalCalendarSources?: number;
  };
  
  // 🕒 ZEITBUDGET FEATURES (Version 2.3+)
  personalCapacity?: any; // Persönliche Kapazitätsplanung und Zeitbudgets
  projectTimebudgets?: any; // Projekt-Zeitbudgets (falls separate gespeichert)
  
  exportDate: string;
  version: string;
}

// Funktion zur Überprüfung der Vollständigkeit von importierten Daten
export function validateImportData(data: ExportData): {
  isComplete: boolean;
  version: string;
  warnings: string[];
  summary: {
    tasks: number;
    archivedTasks: number;
    notes: number;
    dailyNotes: number;
    tags: number;
    boards: number;
    columns: number;
    noteLinks: number;
    images: number;
    notifications: number;
    events: number;
    calendarSources: number;
  };
} {
  const warnings: string[] = [];
  const version = data.version || '1.0';
  
  // Basis-Validierung
  if (!data.tasks || !Array.isArray(data.tasks)) {
    warnings.push('Keine gültigen Aufgaben gefunden');
  }
  
  // Daily Notes überprüfen - Unterstütze verschiedene Datenstrukturen
  let notesArray: any[] = [];
  
  // Bestimme das notes Array basierend auf der Datenstruktur
  if (Array.isArray(data.notes)) {
    // Neues Format: notes ist bereits ein Array
    notesArray = data.notes;
  } else if (data.notes && typeof data.notes === 'object' && Array.isArray((data.notes as any).notes)) {
    // Altes/komplexes Format: notes ist ein Objekt mit notes-Property
    notesArray = (data.notes as any).notes;
  } else {
    // Fallback - leeres Array wenn notes nicht verfügbar
    notesArray = [];
  }
  
  // Validierung der notes-Struktur
  if (notesArray.length === 0) {
    warnings.push('Keine Notizen gefunden');
  }
  
  if (!data.preferences) {
    warnings.push('Keine Benutzereinstellungen gefunden');
  }
  
  // Erweiterte Validierung für Version 2.0+
  if (version === '1.0') {
    warnings.push('Ältere Export-Version - möglicherweise unvollständige Daten');
  }
  
  if (!data.archivedTasks) {
    warnings.push('Keine archivierten Aufgaben gefunden');
  }
  
  if (!data.imageStorage) {
    warnings.push('Kein Bildspeicher gefunden');
  }
  
  if (!data.noteLinks) {
    warnings.push('Keine Notiz-Verknüpfungen gefunden');
  }
  
  const dailyNotes = notesArray.filter(note => note && note.dailyNote) || [];
  if (dailyNotes.length === 0) {
    warnings.push('Keine Daily Notes gefunden');
  }
  
  const summary = {
    tasks: data.tasks?.length || 0,
    archivedTasks: data.archivedTasks?.length || 0,
    notes: notesArray.length,
    dailyNotes: dailyNotes.length,
    tags: data.tags?.length || 0,
    boards: data.boards?.length || data.kanbanBoards?.length || 0,
    columns: data.columns?.length || 0,
    noteLinks: data.noteLinks?.length || 0,
    images: data.imageStorage?.images?.length || 0,
    notifications: data.notifications?.length || 0,
    events: data.events?.length || 0,
    calendarSources: data.calendarSources?.length || 0,
  };
  
  const isComplete = warnings.length === 0;
  
  return {
    isComplete,
    version,
    warnings,
    summary
  };
}

// Hilfsfunktion zum Extrahieren von Integration-Einstellungen
function extractIntegrationSettings(preferences: any): ExportData['integrations'] {
  const integrations: ExportData['integrations'] = {};

  // Microsoft To-Do Integration
  if (preferences?.microsoftTodo) {
    integrations.microsoftTodo = {
      enabled: preferences.microsoftTodo.enabled || false,
      selectedListId: preferences.microsoftTodo.selectedListId,
      selectedListName: preferences.microsoftTodo.selectedListName,
      autoSync: preferences.microsoftTodo.autoSync,
      syncInterval: preferences.microsoftTodo.syncInterval,
      syncOnStart: preferences.microsoftTodo.syncOnStart,
      syncOnTaskChange: preferences.microsoftTodo.syncOnTaskChange,
      bidirectionalSync: preferences.microsoftTodo.bidirectionalSync,
      conflictResolution: preferences.microsoftTodo.conflictResolution,
      lastSync: preferences.microsoftTodo.lastSync,
      lastSyncStatus: preferences.microsoftTodo.lastSyncStatus,
      lastSyncError: preferences.microsoftTodo.lastSyncError,
    };
  }

  // Toggl Integration
  if (preferences?.toggl) {
    integrations.toggl = {
      enabled: preferences.toggl.enabled || false,
      apiToken: preferences.toggl.apiToken ? '[GESCHÜTZT]' : undefined, // Sensible Daten anonymisieren
      workspaceId: preferences.toggl.workspaceId,
      defaultProjectId: preferences.toggl.defaultProjectId,
      autoSync: preferences.toggl.autoSync,
      syncOnStart: preferences.toggl.syncOnStart,
      syncOnPause: preferences.toggl.syncOnPause,
      syncOnStop: preferences.toggl.syncOnStop,
      createProjectsAutomatically: preferences.toggl.createProjectsAutomatically,
      useTaskDescriptions: preferences.toggl.useTaskDescriptions,
      roundTimeToMinutes: preferences.toggl.roundTimeToMinutes,
    };
  }

  // CalDAV Integration
  if (preferences?.caldav) {
    integrations.caldav = {
      enabled: preferences.caldav.enabled || false,
      serverUrl: preferences.caldav.serverUrl,
      username: preferences.caldav.username,
      calendarUrl: preferences.caldav.calendarUrl,
      autoSync: preferences.caldav.autoSync,
      syncInterval: preferences.caldav.syncInterval,
      syncOnStart: preferences.caldav.syncOnStart,
      syncOnTaskChange: preferences.caldav.syncOnTaskChange,
      syncOnlyCompleted: preferences.caldav.syncOnlyCompleted,
      bidirectionalSync: preferences.caldav.bidirectionalSync,
      lastSync: preferences.caldav.lastSync,
      lastSyncStatus: preferences.caldav.lastSyncStatus,
      lastSyncError: preferences.caldav.lastSyncError,
      conflictResolution: preferences.caldav.conflictResolution,
    };
  }

  // Nextcloud Integration (aus localStorage)
  try {
    const nextcloudConfig = localStorage.getItem('nextcloud_config');
    if (nextcloudConfig) {
      const config = JSON.parse(nextcloudConfig);
      integrations.nextcloud = {
        enabled: config.enabled || false,
        serverUrl: config.serverUrl,
        username: config.username,
        syncFolder: config.syncFolder,
        autoSync: config.autoSync,
        syncInterval: config.syncInterval,
        lastSync: config.lastSync,
        totalSyncs: config.totalSyncs,
      };
    }
  } catch (error) {
    console.warn('Fehler beim Laden der Nextcloud-Konfiguration:', error);
  }

  // Dropbox E2EE Integration (stored in preferences)
  if (preferences?.dropbox) {
    integrations.dropbox = {
      enabled: preferences.dropbox.enabled || false,
      appKey: preferences.dropbox.appKey || undefined,
      accountEmail: preferences.dropbox.accountEmail || undefined,
      accountName: preferences.dropbox.accountName || undefined,
      folderPath: preferences.dropbox.folderPath || undefined,
      autoSync: preferences.dropbox.autoSync,
      syncInterval: preferences.dropbox.syncInterval,
      lastSync: preferences.dropbox.lastSync,
      lastSyncStatus: preferences.dropbox.lastSyncStatus,
      // Never export tokens or passphrase; only hint
      passphraseHint: preferences.dropbox.passphraseHint || undefined,
    } as any;
  }

  return integrations;
}

// JSON Export (vollständig) - Enhanced for complete export with all new features
export function exportToJSON(data: ExportData, encrypted = false): string {
  // Extrahiere Integration-Einstellungen
  const integrations = extractIntegrationSettings(data.preferences);

  // Calculate metadata
  const metadata = {
    totalTasks: data.tasks?.length || 0,
    totalNotes: data.notes?.length || 0,
    totalTags: data.tags?.length || 0,
    totalBoards: data.boards?.length || 0,
    totalEvents: data.events?.length || 0,
    totalCalendarSources: data.calendarSources?.length || 0,
    totalPinColumns: data.pinColumns?.length || 0, // ✨ Neue Metadaten
    totalNoteLinks: data.noteLinks?.length || 0,
    totalIntegrations: Object.keys(integrations).filter(key => integrations[key as keyof typeof integrations]?.enabled).length,
    // 🕒 Zeitbudget-Metadaten
    hasPersonalCapacity: !!data.personalCapacity,
    projectsWithTimebudgets: data.columns?.filter(col => col.type === 'project' && col.timebudget)?.length || 0,
    dataSize: 0, // Wird später berechnet
    exportTime: Date.now()
  };

  const exportData = {
    ...data,
    integrations, // ✅ Integration-Einstellungen explizit hinzufügen
    metadata,
    version: '2.3', // ✨ Version für Zeitbudget-Features
    exportDate: new Date().toISOString(),
    // Ensure all optional fields are included even if empty
    notes: data.notes || [],
    noteLinks: data.noteLinks || [],
    preferences: data.preferences || {},
    events: data.events || [],
    calendarSources: data.calendarSources || [],
    // ✨ Neue Features explizit sicherstellen
    pinColumns: data.pinColumns || [],
    notesViewState: data.notesViewState || {},
    emailMode: data.emailMode || false,
    // 🕒 Zeitbudget-Features sicherstellen
    personalCapacity: data.personalCapacity || null,
    projectTimebudgets: data.projectTimebudgets || null,
  };

  // Berechne finale Datengröße
  metadata.dataSize = JSON.stringify(exportData).length;

  let jsonString = JSON.stringify(exportData, null, 2);
  
  if (encrypted) {
    // Simple Base64 encoding (in production, use proper encryption)
    jsonString = btoa(jsonString);
  }
  
  return jsonString;
}

// CSV Export - Enhanced to include all task fields
export function exportToCSV(tasks: Task[]): string {
  const headers = [
    'ID',
    'Titel',
    'Beschreibung',
    'Abgeschlossen',
    'Priorität',
    'Geschätzte Zeit (Min)',
    'Getrackte Zeit (Min)',
    'Tatsächliche Zeit (Min)',
    'Tags',
    'Subtasks',
    'Spalte',
    'Fälligkeitsdatum',
    'Deadline',
    'Wiederholung',
    'Timer Status',
    'Attachments',
    'Verknüpfte Notizen',
    'Position',
    'Erstellt am',
    'Aktualisiert am'
  ];

  const rows = tasks.map(task => [
    task.id,
    `"${task.title.replace(/"/g, '""')}"`,
    `"${(task.description || '').replace(/"/g, '""')}"`,
    task.completed ? 'Ja' : 'Nein',
    task.priority === 'high' ? 'Hoch' : task.priority === 'medium' ? 'Mittel' : 'Niedrig',
    task.estimatedTime || '',
    task.trackedTime || '',
    task.actualTime || '',
    `"${task.tags.join(', ')}"`,
    `"${task.subtasks.length > 0 ? task.subtasks.map(st => `${st.title}${st.completed ? '✓' : ''}`).join('; ') : ''}"`,
    task.columnId,
    task.reminderDate || '',
    '', // removed deadline field
          '',
    task.timerState ? `"${task.timerState.isActive ? 'Aktiv' : 'Inaktiv'} (${task.timerState.mode})"` : '',
    task.attachments ? `"${task.attachments.map(att => att.filename).join('; ')}"` : '',
    task.linkedNotes ? `"${task.linkedNotes.join(', ')}"` : '',
    task.position,
    task.createdAt,
    task.updatedAt
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

// CSV Export for Notes - New function
export function exportNotesToCSV(notes: Note[]): string {
  const headers = [
    'ID',
    'Titel',
    'Inhalt (Vorschau)',
    'Tags',
    'Verknüpfte Aufgaben',
    'Verknüpfte Notizen',
    'Angeheftet',
    'Archiviert',
    'Wortanzahl',
    'Lesezeit (Min)',
    'Erstellt am',
    'Aktualisiert am'
  ];

  const rows = notes.map(note => [
    note.id,
    `"${note.title.replace(/"/g, '""')}"`,
    `"${(note.content.substring(0, 100) + (note.content.length > 100 ? '...' : '')).replace(/"/g, '""')}"`,
    `"${note.tags.join(', ')}"`,
    `"${note.linkedTasks.join(', ')}"`,
    `"${note.linkedNotes.join(', ')}"`,
    note.pinned ? 'Ja' : 'Nein',
    note.archived ? 'Ja' : 'Nein',
    note.metadata?.wordCount || 0,
    note.metadata?.readingTime || 0,
    note.createdAt,
    note.updatedAt
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

// Combined CSV Export - Tasks and Notes in separate sheets (or sections)
export function exportAllToCSV(tasks: Task[], notes: Note[]): string {
  const tasksCsv = exportToCSV(tasks);
  const notesCsv = exportNotesToCSV(notes);
  
  return `AUFGABEN\n${tasksCsv}\n\n\nNOTIZEN\n${notesCsv}`;
}

// PDF Export (simplified - in production use proper PDF library)
export function exportToPDF(tasks: Task[], notes?: Note[]): string {
  // This is a simplified version - in production, use libraries like jsPDF or PDFKit
  const content = `
TaskFuchs Export
Exportiert am: ${format(new Date(), 'dd.MM.yyyy HH:mm')}

Aufgaben (${tasks.length}):
${tasks.map(task => `
- ${task.title} ${task.completed ? '✓' : '○'}
  ${task.description ? `  Beschreibung: ${task.description}` : ''}
  ${task.tags.length > 0 ? `  Tags: ${task.tags.join(', ')}` : ''}
  ${task.reminderDate ? `  Erinnerung: ${format(new Date(task.reminderDate), 'dd.MM.yyyy')}` : ''}
  ${task.estimatedTime ? `  Geschätzte Zeit: ${task.estimatedTime} Min` : ''}
`).join('')}

${notes && notes.length > 0 ? `
Notizen (${notes.length}):
${notes.map(note => `
- ${note.title} ${note.pinned ? '📌' : ''}${note.archived ? ' [Archiviert]' : ''}
  ${note.tags.length > 0 ? `  Tags: ${note.tags.join(', ')}` : ''}
  ${note.linkedTasks.length > 0 ? `  Verknüpfte Aufgaben: ${note.linkedTasks.length}` : ''}
  Erstellt: ${format(new Date(note.createdAt), 'dd.MM.yyyy')}
  ${note.content ? `\n  Inhalt:\n  ${note.content.split('\n').map(line => `  ${line}`).join('\n')}` : ''}
`).join('')}
` : ''}
  `;
  
  return content;
}

// =====================
// IMPORT FUNCTIONS
// =====================

// TaskFuchs JSON Import
export function importFromJSON(jsonString: string, encrypted = false): ExportData | null {
  try {
    let dataString = jsonString;
    
    if (encrypted) {
      // Simple Base64 decoding
      dataString = atob(jsonString);
    }
    
    const data = JSON.parse(dataString);
    
    // Validate required fields
    if (!data.tasks || !Array.isArray(data.tasks)) {
      throw new Error('Invalid TaskFuchs format: missing tasks array');
    }
    
    return data as ExportData;
  } catch (error) {
    console.error('JSON Import Error:', error);
    return null;
  }
}

// Generic CSV Import
export function importFromCSV(csvString: string): Task[] {
  const lines = csvString.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim());
  const tasks: Task[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 2) continue;
    
    const task: Task = {
      id: values[0] || `imported-${Date.now()}-${i}`,
      title: values[1] || 'Unbenannte Aufgabe',
      description: values[2] || undefined,
      completed: values[3]?.toLowerCase() === 'ja' || values[3]?.toLowerCase() === 'true',
      priority: mapPriority(values[4]),
      estimatedTime: parseInt(values[5]) || undefined,
      trackedTime: parseInt(values[6]) || undefined,
      tags: values[7] ? values[7].split(',').map(t => t.trim()).filter(t => t) : [],
      subtasks: [],
      columnId: values[8] || 'inbox',
      reminderDate: values[9] || undefined,
              // deadline field removed
      createdAt: values[11] || new Date().toISOString(),
      updatedAt: values[12] || new Date().toISOString(),
      position: i
    };
    
    tasks.push(task);
  }
  
  return tasks;
}

// Todoist CSV Import
export function importFromTodoist(csvString: string): Task[] {
  const lines = csvString.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  // Todoist CSV format: TYPE,CONTENT,DESCRIPTION,PRIORITY,INDENT,AUTHOR,RESPONSIBLE,DATE,DATE_LANG,TIMEZONE
  const tasks: Task[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 2 || values[0] !== 'task') continue;
    
    const task: Task = {
      id: `todoist-${Date.now()}-${i}`,
      title: values[1] || 'Unbenannte Aufgabe',
      description: values[2] || undefined,
      completed: false,
      priority: mapTodoistPriority(values[3]),
      estimatedTime: undefined,
      trackedTime: undefined,
      tags: extractTodoistTags(values[1]),
      subtasks: [],
      columnId: 'inbox',
      reminderDate: values[7] || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      position: i
    };
    
    tasks.push(task);
  }
  
  return tasks;
}

// Microsoft To Do CSV Import
export function importFromMicrosoftToDo(csvString: string): Task[] {
  const lines = csvString.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  // Microsoft To Do CSV format: Subject,Start Date,Due Date,Status,Priority,Percent Complete,Categories
  const tasks: Task[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 1) continue;
    
    const task: Task = {
      id: `mstodo-${Date.now()}-${i}`,
      title: values[0] || 'Unbenannte Aufgabe',
      description: undefined,
      completed: values[3]?.toLowerCase() === 'completed',
      priority: mapMicrosoftPriority(values[4]),
      estimatedTime: undefined,
      trackedTime: undefined,
      tags: values[6] ? values[6].split(';').map(t => t.trim()).filter(t => t) : [],
      subtasks: [],
      columnId: 'inbox',
      reminderDate: values[2] || undefined,
      createdAt: values[1] || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      position: i
    };
    
    tasks.push(task);
  }
  
  return tasks;
}

// =====================
// HELPER FUNCTIONS
// =====================

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result.map(val => val.replace(/^"|"$/g, '')); // Remove surrounding quotes
}

function mapPriority(priority: string): 'none' | 'low' | 'medium' | 'high' {
  const p = priority?.toLowerCase();
  if (p === 'hoch' || p === 'high' || p === '3') return 'high';
  if (p === 'mittel' || p === 'medium' || p === '2') return 'medium';
  if (p === 'niedrig' || p === 'low' || p === '1') return 'low';
  if (p === 'ohne' || p === 'none' || p === '0' || p === '') return 'none';
  return 'none';
}

function mapTodoistPriority(priority: string): 'none' | 'low' | 'medium' | 'high' {
  const p = parseInt(priority);
  if (p >= 3) return 'high';
  if (p === 2) return 'medium';
  if (p === 1) return 'low';
  return 'none';
}

function mapMicrosoftPriority(priority: string): 'none' | 'low' | 'medium' | 'high' {
  const p = priority?.toLowerCase();
  if (p === 'high' || p === 'important') return 'high';
  if (p === 'normal' || p === 'medium') return 'medium';
  if (p === 'low') return 'low';
  return 'none';
}

function extractTodoistTags(content: string): string[] {
  const matches = content.match(/@\w+/g);
  return matches ? matches.map(tag => tag.substring(1)) : [];
}

// =====================
// INTEGRATION-SPEZIFISCHE EXPORT-FUNKTIONEN
// =====================

// Exportiert nur Integration-Einstellungen (für Backup oder Migration)
export function exportIntegrationsOnly(preferences: UserPreferences): string {
  const integrations = extractIntegrationSettings(preferences);
  
  const exportData = {
    app: 'TaskFuchs',
    type: 'integrations-only',
    version: '2.1',
    exportDate: new Date().toISOString(),
    integrations,
    metadata: {
      totalIntegrations: Object.keys(integrations).length,
      enabledIntegrations: Object.keys(integrations).filter(key => integrations[key as keyof typeof integrations]?.enabled).length,
      exportTime: Date.now()
    }
  };

  return JSON.stringify(exportData, null, 2);
}

// Validiert ob alle erforderlichen Integration-Einstellungen vorhanden sind
export function validateIntegrationExport(data: ExportData): { isValid: boolean; missingIntegrations: string[]; warnings: string[] } {
  const missingIntegrations: string[] = [];
  const warnings: string[] = [];

  // Überprüfe ob Integration-Daten vorhanden sind
  if (!data.integrations) {
    warnings.push('Keine Integration-Einstellungen gefunden - möglicherweise ältere Export-Version');
    return { isValid: true, missingIntegrations, warnings };
  }

  // Überprüfe kritische Integration-Einstellungen mit type-safe Zugriff
  const integrations = data.integrations;
  
  // Validiere Microsoft To-Do
  if (integrations.microsoftTodo?.enabled) {
    const msIntegration = integrations.microsoftTodo as any;
    if (!msIntegration.selectedListId || !msIntegration.selectedListName) {
      warnings.push('Microsoft To-Do ist aktiviert, aber Listen-Informationen fehlen');
    }
  }
  
  // Validiere CalDAV
  if (integrations.caldav?.enabled) {
    const caldavIntegration = integrations.caldav as any;
    if (!caldavIntegration.serverUrl || !caldavIntegration.username) {
      warnings.push('CalDAV ist aktiviert, aber Server-Informationen fehlen');
    }
  }
  
  // Validiere Toggl
  if (integrations.toggl?.enabled) {
    const togglIntegration = integrations.toggl as any;
    if (!togglIntegration.workspaceId) {
      warnings.push('Toggl ist aktiviert, aber Workspace-Informationen fehlen');
    }
  }
  
  // Validiere Nextcloud
  if (integrations.nextcloud?.enabled) {
    const nextcloudIntegration = integrations.nextcloud as any;
    if (!nextcloudIntegration.serverUrl || !nextcloudIntegration.username) {
      warnings.push('Nextcloud ist aktiviert, aber Server-Informationen fehlen');
    }
  }

  return {
    isValid: true,
    missingIntegrations,
    warnings
  };
}

// =====================
// FILE DOWNLOAD HELPERS
// =====================

export function downloadFile(content: string, filename: string, mimeType: string = 'application/json') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateFilename(prefix: string, extension: string): string {
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
  return `${prefix}_${timestamp}.${extension}`;
}

// =====================
// TXT IMPORT/EXPORT FUNCTIONS
// =====================

/**
 * Exports all tasks to TXT format using Smart Task Input format
 * Each task becomes one line with title, notes, priority, tags, and date
 */
export function exportTasksToTXT(tasks: Task[]): string {
  const lines: string[] = [];

  for (const task of tasks) {
    if (task.archived) continue; // Skip archived tasks

    let line = task.title;

    // Add priority
    if (task.priority) {
      switch (task.priority) {
        case 'high':
          line += ' !!!';
          break;
        case 'medium':
          line += ' !!';
          break;
        case 'low':
          line += ' !';
          break;
      }
    }

    // Add estimated time
    if (task.estimatedTime) {
      if (task.estimatedTime >= 60) {
        const hours = Math.floor(task.estimatedTime / 60);
        const minutes = task.estimatedTime % 60;
        if (minutes > 0) {
          line += ` ${hours}h${minutes}m`;
        } else {
          line += ` ${hours}h`;
        }
      } else {
        line += ` ${task.estimatedTime}m`;
      }
    }

    // Add tags
    if (task.tags && task.tags.length > 0) {
      for (const tag of task.tags) {
        line += ` #${tag}`;
      }
    }

    // Add deadline date
    if (task.deadline) {
      const deadlineDate = new Date(task.deadline);
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);

      if (deadlineDate.toDateString() === today.toDateString()) {
        line += ' heute';
      } else if (deadlineDate.toDateString() === tomorrow.toDateString()) {
        line += ' morgen';
      } else {
        // Format as DD.MM.YYYY
        const day = deadlineDate.getDate().toString().padStart(2, '0');
        const month = (deadlineDate.getMonth() + 1).toString().padStart(2, '0');
        const year = deadlineDate.getFullYear();
        line += ` ${day}.${month}.${year}`;
      }
    }

    // Add reminder date if different from deadline
    if (task.reminderDate && task.reminderDate !== task.deadline) {
      const reminderDate = new Date(task.reminderDate);
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);

      if (reminderDate.toDateString() === today.toDateString()) {
        line += ' @heute';
      } else if (reminderDate.toDateString() === tomorrow.toDateString()) {
        line += ' @morgen';
      } else {
        // Format as @DD.MM.YYYY
        const day = reminderDate.getDate().toString().padStart(2, '0');
        const month = (reminderDate.getMonth() + 1).toString().padStart(2, '0');
        const year = reminderDate.getFullYear();
        line += ` @${day}.${month}.${year}`;
      }
    }

    // Add description/note
    if (task.description) {
      // Clean up description - remove links that were extracted during parsing
      let cleanDescription = task.description
        .replace(/🔗\s*https?:\/\/[^\s\n]+/g, '') // Remove extracted links
        .replace(/\n\n+/g, '\n') // Replace multiple newlines with single
        .trim();
      
      if (cleanDescription) {
        line += ` n ${cleanDescription}`;
      }
    }

    // Add completed status (for reference, though we skip archived)
    if (task.completed) {
      line = `✓ ${line}`;
    }

    lines.push(line);
  }

  return lines.join('\n');
}

/**
 * Imports tasks from TXT format using Smart Task Input parsing
 * Each line is parsed as a separate task using the existing task parser
 */
export function importFromTXT(txtContent: string): Task[] {
  const lines = txtContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const importedTasks: Task[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Skip empty lines and comments (lines starting with #, //, or %)
    if (!line || line.startsWith('#') || line.startsWith('//') || line.startsWith('%')) {
      continue;
    }

    // Check if task is already completed
    let isCompleted = false;
    if (line.startsWith('✓ ') || line.startsWith('✅ ') || line.startsWith('[x] ') || line.startsWith('[X] ')) {
      isCompleted = true;
      line = line.replace(/^(✓|✅|\[x\]|\[X\])\s*/, '').trim();
    }

    // Parse the line using the existing smart task parser
    const parseResult = parseTaskInput(line);
    
    if (parseResult.success && parseResult.task) {
      const parsedTask = parseResult.task;
      
      // Create new task with parsed data
      const newTask: Task = {
        id: crypto.randomUUID(),
        title: parsedTask.title,
        description: parsedTask.description || '',
        completed: isCompleted,
        priority: parsedTask.priority || 'medium',
        estimatedTime: parsedTask.estimatedTime,
        trackedTime: 0,
        tags: parsedTask.tags || [],
        subtasks: [],
        columnId: parsedTask.columnId || 'inbox', // Default to inbox if no column specified
        deadline: parsedTask.dueDate, // Map dueDate to deadline
        reminderDate: parsedTask.dueDate, // Also set as reminder date
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        position: Date.now() + i, // Ensure unique positions
        archived: false
      };

      // If task is completed, set completion time
      if (isCompleted) {
        newTask.completedAt = new Date().toISOString();
      }

      importedTasks.push(newTask);
    } else {
      // Log parsing errors but continue with other lines
      console.warn(`Could not parse line ${i + 1}: "${line}"`, parseResult.errors);
    }
  }

  return importedTasks;
} 