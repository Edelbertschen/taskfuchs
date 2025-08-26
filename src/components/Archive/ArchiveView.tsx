import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useAppTranslation } from '../../utils/i18nHelpers';
import { useTranslation } from 'react-i18next';
import { 
  Archive, 
  Trash2, 
  RotateCcw, 
  Search, 
  X, 
  CheckSquare, 
  Square,
  AlertTriangle,
  FileText,
  ClipboardList
} from 'lucide-react';
import type { Task, Note } from '../../types';
import { format, isToday, isYesterday, isThisWeek, isThisYear } from 'date-fns';
import { de, enUS } from 'date-fns/locale';

export function ArchiveView() {
  const { state, dispatch } = useApp();
  const { archive } = useAppTranslation();
  const { i18n, t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'tasks' | 'notes'>('tasks');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Get archived notes
  const archivedNotes = (Array.isArray(state.notes?.notes) ? state.notes.notes : []).filter(note => note.archived);

  const filteredArchivedTasks = useMemo(() => {
    return state.archivedTasks.filter(task => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [state.archivedTasks, searchQuery]);

  const filteredArchivedNotes = useMemo(() => {
    return archivedNotes.filter(note => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query) ||
        note.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [archivedNotes, searchQuery]);

  // Group tasks by archive date
  const groupedTasks = filteredArchivedTasks.reduce((groups, task) => {
    const archiveDate = format(new Date(task.updatedAt), 'yyyy-MM-dd');
    if (!groups[archiveDate]) {
      groups[archiveDate] = [];
    }
    groups[archiveDate].push(task);
    return groups;
  }, {} as Record<string, Task[]>);

  // Group notes by archive date
  const groupedNotes = filteredArchivedNotes.reduce((groups, note) => {
    const archiveDate = format(new Date(note.updatedAt), 'yyyy-MM-dd');
    if (!groups[archiveDate]) {
      groups[archiveDate] = [];
    }
    groups[archiveDate].push(note);
    return groups;
  }, {} as Record<string, Note[]>);

  const sortedTaskDates = Object.keys(groupedTasks).sort((a, b) => b.localeCompare(a));
  const sortedNoteDates = Object.keys(groupedNotes).sort((a, b) => b.localeCompare(a));

  const formatDateLabel = (dateString: string) => {
    const date = new Date(dateString);
    const isGerman = i18n.language === 'de';
    const locale = isGerman ? de : enUS;
    
    if (isToday(date)) {
      return archive.dateLabels.today();
    } else if (isYesterday(date)) {
      return archive.dateLabels.yesterday();
    } else if (isThisWeek(date)) {
      return format(date, 'EEEE', { locale }); // "Montag" / "Monday"
    } else if (isThisYear(date)) {
      return format(date, isGerman ? 'dd. MMMM' : 'MMMM d', { locale }); // "15. März" / "March 15"
    } else {
      return format(date, isGerman ? 'dd. MMMM yyyy' : 'MMMM d, yyyy', { locale }); // "15. März 2023" / "March 15, 2023"
    }
  };

  const handleSelectTask = (taskId: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const handleSelectNote = (noteId: string) => {
    const newSelected = new Set(selectedNotes);
    if (newSelected.has(noteId)) {
      newSelected.delete(noteId);
    } else {
      newSelected.add(noteId);
    }
    setSelectedNotes(newSelected);
  };

  const handleSelectAll = () => {
    if (activeTab === 'tasks') {
      if (selectedTasks.size === filteredArchivedTasks.length) {
        setSelectedTasks(new Set());
      } else {
        setSelectedTasks(new Set(filteredArchivedTasks.map(task => task.id)));
      }
    } else {
      if (selectedNotes.size === filteredArchivedNotes.length) {
        setSelectedNotes(new Set());
      } else {
        setSelectedNotes(new Set(filteredArchivedNotes.map(note => note.id)));
      }
    }
  };

  const handleRestoreTask = (taskId: string) => {
    dispatch({ type: 'RESTORE_TASK', payload: taskId });
  };

  const handleDeleteTask = (taskId: string) => {
    dispatch({ type: 'DELETE_ARCHIVED_TASK', payload: taskId });
  };

  const handleRestoreNote = (noteId: string) => {
    const note = archivedNotes.find(n => n.id === noteId);
    if (note) {
      dispatch({ 
        type: 'UPDATE_NOTE', 
        payload: { ...note, archived: false } 
      });
    }
  };

  const handleDeleteNote = (noteId: string) => {
    dispatch({ type: 'DELETE_NOTE', payload: noteId });
  };

  const handleRestoreSelected = () => {
    if (activeTab === 'tasks') {
      selectedTasks.forEach(taskId => {
        dispatch({ type: 'RESTORE_TASK', payload: taskId });
      });
      setSelectedTasks(new Set());
    } else {
      selectedNotes.forEach(noteId => {
        handleRestoreNote(noteId);
      });
      setSelectedNotes(new Set());
    }
  };

  const handleDeleteSelected = () => {
    if (activeTab === 'tasks') {
      selectedTasks.forEach(taskId => {
        dispatch({ type: 'DELETE_ARCHIVED_TASK', payload: taskId });
      });
      setSelectedTasks(new Set());
    } else {
      selectedNotes.forEach(noteId => {
        dispatch({ type: 'DELETE_NOTE', payload: noteId });
      });
      setSelectedNotes(new Set());
    }
    setShowDeleteModal(false);
  };

  const handleClearAll = () => {
    if (activeTab === 'tasks') {
      dispatch({ type: 'CLEAR_ARCHIVE' });
      setSelectedTasks(new Set());
    } else {
      archivedNotes.forEach(note => {
        dispatch({ type: 'DELETE_NOTE', payload: note.id });
      });
      setSelectedNotes(new Set());
    }
    setShowClearAllModal(false);
  };

  return (
    <div 
      className="h-full flex flex-col bg-gray-50 dark:bg-gray-900"
    >
      {/* Header */}
      <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <Archive 
              className="w-8 h-8" 
              style={{ color: state.preferences.accentColor }}
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {archive.title()}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {activeTab === 'tasks' 
                  ? t('archive.archived_tasks_count', { count: state.archivedTasks.length })
                  : t('archive.archived_notes_count', { count: archivedNotes.length })
                }
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={archive.searchPlaceholder()}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all duration-200"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Elegant Toggle Switch */}
        <div className="flex items-center justify-center max-w-7xl mx-auto mt-6">
          <div className="relative bg-gray-200 dark:bg-gray-700 rounded-2xl p-1 shadow-inner">
            {/* Background Slider */}
            <div 
              className="absolute top-1 h-12 rounded-xl transition-all duration-300 ease-out shadow-lg"
              style={{
                backgroundColor: state.preferences.accentColor,
                boxShadow: `0 4px 20px -4px ${state.preferences.accentColor}60`,
                width: '120px',
                left: activeTab === 'tasks' ? '4px' : activeTab === 'notes' ? '124px' : '4px',
              }}
            />
            
            {/* Toggle Options */}
            <div className="relative flex">
              {/* Tasks Option */}
              <button
                onClick={() => {
                  setActiveTab('tasks');
                  setSelectedTasks(new Set());
                  setSelectedNotes(new Set());
                }}
                className={`relative flex items-center justify-center space-x-2 px-4 py-3 rounded-xl transition-all duration-300 z-10 ${
                  activeTab === 'tasks'
                    ? 'text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
                style={{ width: '120px' }}
              >
                <ClipboardList className="w-4 h-4" />
                <span className="font-medium text-sm">{archive.tabs.tasks()}</span>
              </button>

              {/* Notes Option */}
              <button
                onClick={() => {
                  setActiveTab('notes');
                  setSelectedTasks(new Set());
                  setSelectedNotes(new Set());
                }}
                className={`relative flex items-center justify-center space-x-2 px-4 py-3 rounded-xl transition-all duration-300 z-10 ${
                  activeTab === 'notes'
                    ? 'text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
                style={{ width: '120px' }}
              >
                <FileText className="w-4 h-4" />
                <span className="font-medium text-sm">{archive.tabs.notes()}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {((activeTab === 'tasks' && selectedTasks.size > 0) || (activeTab === 'notes' && selectedNotes.size > 0)) && (
        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700" style={{ backgroundColor: `${state.preferences.accentColor}20` }}>
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center space-x-3" style={{ color: state.preferences.accentColor }}>
              <CheckSquare className="w-5 h-5" />
              <span className="font-medium">
                {activeTab === 'tasks' 
                  ? archive.selection.tasksSelected(selectedTasks.size)
                  : archive.selection.notesSelected(selectedNotes.size)
                }
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleRestoreSelected}
                className="flex items-center space-x-2 px-4 py-2 text-white rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm"
                style={{ backgroundColor: state.preferences.accentColor }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${state.preferences.accentColor}CC`}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = state.preferences.accentColor || '#0ea5e9'}
              >
                <RotateCcw className="w-4 h-4" />
                <span>{archive.selection.restore()}</span>
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm"
              >
                <Trash2 className="w-4 h-4" />
                <span>{archive.selection.delete()}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'tasks' ? (
            <>
              {state.archivedTasks.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center">
                    <Archive className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {archive.emptyStates.noArchivedTasksTitle()}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {archive.emptyStates.noArchivedTasksDesc()}
                  </p>
                </div>
              ) : filteredArchivedTasks.length === 0 ? (
                <div className="text-center py-12">
                  <div 
                    className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                    style={{ 
                      background: `linear-gradient(to bottom right, ${state.preferences.accentColor}20, ${state.preferences.accentColor}30)`
                    }}
                  >
                    <Search className="w-8 h-8" style={{ color: state.preferences.accentColor }} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Keine Ergebnisse
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Für "{searchQuery}" wurden keine archivierten Aufgaben gefunden.
                  </p>
                </div>
              ) : (
                <>
                  {/* Actions Bar */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={handleSelectAll}
                        className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200"
                      >
                        {selectedTasks.size === filteredArchivedTasks.length ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                        <span>Alle auswählen</span>
                      </button>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {filteredArchivedTasks.length} von {state.archivedTasks.length} Aufgabe{filteredArchivedTasks.length !== 1 ? 'n' : ''}
                      </span>
                    </div>
                    {state.archivedTasks.length > 0 && (
                      <button
                        onClick={() => setShowClearAllModal(true)}
                        className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Archiv leeren</span>
                      </button>
                    )}
                  </div>

                  {/* Tasks List */}
                  <div className="space-y-6">
                    {sortedTaskDates.map((date) => (
                      <div key={date} className="space-y-2">
                        {/* Date Header */}
                        <div className="flex items-center space-x-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            {formatDateLabel(date)}
                          </h3>
                          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                            {groupedTasks[date].length}
                          </span>
                        </div>
                       
                        {/* Tasks for this date */}
                        <div className="space-y-1">
                          {groupedTasks[date].map((task) => (
                            <TaskArchiveCard
                              key={task.id}
                              task={task}
                              isSelected={selectedTasks.has(task.id)}
                              onSelect={() => handleSelectTask(task.id)}
                              onRestore={() => handleRestoreTask(task.id)}
                              onDelete={() => handleDeleteTask(task.id)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              {archivedNotes.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {archive.emptyStates.noArchivedNotesTitle()}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {archive.emptyStates.noArchivedNotesDesc()}
                  </p>
                </div>
              ) : filteredArchivedNotes.length === 0 ? (
                <div className="text-center py-12">
                  <div 
                    className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                    style={{ 
                      background: `linear-gradient(to bottom right, ${state.preferences.accentColor}20, ${state.preferences.accentColor}30)`
                    }}
                  >
                    <Search className="w-8 h-8" style={{ color: state.preferences.accentColor }} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Keine Ergebnisse
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Für "{searchQuery}" wurden keine archivierten Notizen gefunden.
                  </p>
                </div>
              ) : (
                <>
                  {/* Actions Bar */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={handleSelectAll}
                        className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200"
                      >
                        {selectedNotes.size === filteredArchivedNotes.length ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                        <span>Alle auswählen</span>
                      </button>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {filteredArchivedNotes.length} von {archivedNotes.length} Notiz{filteredArchivedNotes.length !== 1 ? 'en' : ''}
                      </span>
                    </div>
                    {archivedNotes.length > 0 && (
                      <button
                        onClick={() => setShowClearAllModal(true)}
                        className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Archiv leeren</span>
                      </button>
                    )}
                  </div>

                  {/* Notes List */}
                  <div className="space-y-6">
                    {sortedNoteDates.map((date) => (
                      <div key={date} className="space-y-2">
                        {/* Date Header */}
                        <div className="flex items-center space-x-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            {formatDateLabel(date)}
                          </h3>
                          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                            {groupedNotes[date].length}
                          </span>
                        </div>
                       
                        {/* Notes for this date */}
                        <div className="space-y-1">
                          {groupedNotes[date].map((note) => (
                            <NoteArchiveCard
                              key={note.id}
                              note={note}
                              isSelected={selectedNotes.has(note.id)}
                              onSelect={() => handleSelectNote(note.id)}
                              onRestore={() => handleRestoreNote(note.id)}
                              onDelete={() => handleDeleteNote(note.id)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Clear All Modal */}
      {showClearAllModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Archiv leeren
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  Möchten Sie wirklich alle {activeTab === 'tasks' 
                    ? `${state.archivedTasks.length} archivierten Aufgaben` 
                    : `${archivedNotes.length} archivierten Notizen`
                  } endgültig löschen? 
                  Diese Aktion kann nicht rückgängig gemacht werden.
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowClearAllModal(false)}
                    className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleClearAll}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200"
                  >
                    Löschen
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Selected Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {activeTab === 'tasks' ? archive.deleteModal.deleteTasks() : archive.deleteModal.deleteNotes()}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  {activeTab === 'tasks' 
                    ? archive.deleteModal.confirmDeleteTasks(selectedTasks.size)
                    : archive.deleteModal.confirmDeleteNotes(selectedNotes.size)
                  } {archive.deleteModal.warning()}
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
                  >
                    {archive.deleteModal.cancel()}
                  </button>
                  <button
                    onClick={handleDeleteSelected}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200"
                  >
                    {archive.deleteModal.delete()}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface TaskArchiveCardProps {
  task: Task;
  isSelected: boolean;
  onSelect: () => void;
  onRestore: () => void;
  onDelete: () => void;
}

function TaskArchiveCard({ task, isSelected, onSelect, onRestore, onDelete }: TaskArchiveCardProps) {
  const { state } = useApp();
  
  // Generate harmonious colors based on accent color
  const accentColor = state.preferences.accentColor || '#0ea5e9';
  const hexToHsl = (hex: string): [number, number, number] => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h! /= 6;
    }

    return [h! * 360, s * 100, l * 100];
  };

  const hslToHex = (h: number, s: number, l: number): string => {
    s /= 100;
    l /= 100;
    
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 60) {
      r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
      r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
      r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
      r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
      r = x; g = 0; b = c;
    } else if (300 <= h && h < 360) {
      r = c; g = 0; b = x;
    }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  const [h, s, l] = hexToHsl(accentColor);
  const successColor = hslToHex((h + 90) % 360, Math.min(s + 10, 100), Math.min(l + 10, 80));
  const dangerColor = hslToHex((h + 180) % 360, Math.min(s + 30, 100), Math.max(l - 20, 30));
  
  return (
    <div className={`group flex items-center py-2 px-3 rounded-lg transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
      isSelected 
        ? 'bg-gray-100 dark:bg-gray-700/50 border-2 border-gray-300 dark:border-gray-600' 
        : 'border border-transparent'
    }`}>
      {/* Selection Checkbox */}
      <button
        onClick={onSelect}
        className="flex-shrink-0 mr-3 transition-all duration-200 hover:scale-110"
      >
        {isSelected ? (
          <CheckSquare 
            className="w-4 h-4" 
            style={{ color: state.preferences.accentColor }}
          />
        ) : (
          <Square className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
        )}
      </button>

      {/* Task Content */}
      <div className="flex-1 min-w-0 flex items-center space-x-3">
        {/* Title */}
        <h3 className="text-sm font-medium text-gray-900 dark:text-white line-through opacity-75 group-hover:opacity-100 transition-opacity truncate">
          {task.title}
        </h3>

        {/* Tags (max 2) */}
        {task.tags.length > 0 && (
          <div className="flex space-x-1 flex-shrink-0">
            {task.tags.slice(0, 2).map((tag, index) => (
              <span
                key={index}
                className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
              >
                #{tag}
              </span>
            ))}
            {task.tags.length > 2 && (
              <span className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-500 rounded">
                +{task.tags.length - 2}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-1 flex-shrink-0 ml-3">
        <button
          onClick={onRestore}
          className="p-1.5 rounded transition-all duration-200 hover:scale-110"
          style={{ color: successColor }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${successColor}20`}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          title="Wiederherstellen"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded transition-all duration-200 hover:scale-110"
          style={{ color: dangerColor }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${dangerColor}20`}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          title="Löschen"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
} 

interface NoteArchiveCardProps {
  note: Note;
  isSelected: boolean;
  onSelect: () => void;
  onRestore: () => void;
  onDelete: () => void;
}

function NoteArchiveCard({ note, isSelected, onSelect, onRestore, onDelete }: NoteArchiveCardProps) {
  const { state } = useApp();
  
  // Generate harmonious colors based on accent color (same logic as TaskArchiveCard)
  const accentColor = state.preferences.accentColor || '#0ea5e9';
  const hexToHsl = (hex: string): [number, number, number] => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h! /= 6;
    }

    return [h! * 360, s * 100, l * 100];
  };

  const hslToHex = (h: number, s: number, l: number): string => {
    s /= 100;
    l /= 100;
    
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 60) {
      r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
      r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
      r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
      r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
      r = x; g = 0; b = c;
    } else if (300 <= h && h < 360) {
      r = c; g = 0; b = x;
    }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  const [h, s, l] = hexToHsl(accentColor);
  const successColor = hslToHex((h + 90) % 360, Math.min(s + 10, 100), Math.min(l + 10, 80));
  const dangerColor = hslToHex((h + 180) % 360, Math.min(s + 30, 100), Math.max(l - 20, 30));
  
  // Preview of note content (first 100 characters)
  const contentPreview = note.content.replace(/[#*_`~]/g, '').trim().slice(0, 100);
  
  return (
    <div className={`group flex items-center py-3 px-3 rounded-lg transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
      isSelected 
        ? 'bg-gray-100 dark:bg-gray-700/50 border-2 border-gray-300 dark:border-gray-600' 
        : 'border border-transparent'
    }`}>
      {/* Selection Checkbox */}
      <button
        onClick={onSelect}
        className="flex-shrink-0 mr-3 transition-all duration-200 hover:scale-110"
      >
        {isSelected ? (
          <CheckSquare 
            className="w-4 h-4" 
            style={{ color: state.preferences.accentColor }}
          />
        ) : (
          <Square className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
        )}
      </button>

      {/* Note Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* Title with pin indicator */}
            <div className="flex items-center space-x-2">
              <h3 
                className="text-sm font-medium text-gray-900 dark:text-white transition-colors truncate"
                onMouseEnter={(e) => e.currentTarget.style.color = accentColor}
                onMouseLeave={(e) => e.currentTarget.style.color = ''}
              >
                {note.title || 'Unbenannte Notiz'}
              </h3>
              {note.pinned && (
                <span className="text-amber-500" title="Angepinnt">
                  📌
                </span>
              )}
            </div>
            
            {/* Content preview */}
            {contentPreview && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                {contentPreview}
                {note.content.length > 100 && '...'}
              </p>
            )}
            
            {/* Tags (max 3) */}
            {note.tags.length > 0 && (
              <div className="flex space-x-1 mt-2 flex-wrap">
                {note.tags.slice(0, 3).map((tag, index) => (
                  <span
                    key={index}
                    className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                  >
                    #{tag}
                  </span>
                ))}
                {note.tags.length > 3 && (
                  <span className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-500 rounded">
                    +{note.tags.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-1 flex-shrink-0 ml-3">
        <button
          onClick={onRestore}
          className="p-1.5 rounded transition-all duration-200 hover:scale-110"
          style={{ color: successColor }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${successColor}20`}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          title="Wiederherstellen"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded transition-all duration-200 hover:scale-110"
          style={{ color: dangerColor }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${dangerColor}20`}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          title="Löschen"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
} 