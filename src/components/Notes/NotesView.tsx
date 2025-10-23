import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, Plus, List, Edit3, Filter, X, Pin, Archive, Link, FileText, Tag as TagIcon, Clock, RotateCcw, ChevronDown, ChevronRight, Calendar, ChevronLeft, Home, BookOpen } from 'lucide-react';
import { Header } from '../Layout/Header';
import { useApp } from '../../context/AppContext';
import { useAppTranslation } from '../../utils/i18nHelpers';
import { useTranslation } from 'react-i18next';
import type { Note } from '../../types';
import { NoteEditor } from './NoteEditor';
import { DailyNoteConfirmationModal } from '../Common/DailyNoteConfirmationModal';
import { format, addDays, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, parseISO, isThisMonth, isThisWeek, isSameMonth } from 'date-fns';
import { de } from 'date-fns/locale';

export function NotesView() {
  const { state, dispatch } = useApp();
  const { notesView, actions } = useAppTranslation();
  const { t, i18n } = useTranslation();
  const { notes, searchQuery, selectedTags, view, sortBy, sortOrder, showArchived, selectedNote, dailyNotesMode, selectedDailyNoteDate } = state.notes;
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [favoritesExpanded, setFavoritesExpanded] = useState(true);
  const [allNotesExpanded, setAllNotesExpanded] = useState(true);
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showDailyNoteConfirmation, setShowDailyNoteConfirmation] = useState(false);
  const [pendingDailyNoteDate, setPendingDailyNoteDate] = useState<string | null>(null);
  
  const handleFullScreenToggle = (isFullScreen: boolean) => {
    dispatch({ type: 'SET_NOTE_EDITOR_FULLSCREEN', payload: isFullScreen });
  };

  // Sidebar slide-in animation with delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setSidebarVisible(true);
    }, 150); // 150ms delay
    return () => clearTimeout(timer);
  }, []);

  // Initialize Daily Notes mode
  useEffect(() => {
    if (dailyNotesMode && !selectedDailyNoteDate) {
      const today = format(new Date(), 'yyyy-MM-dd');
      selectDailyNote(today);
    }
  }, [dailyNotesMode, selectedDailyNoteDate]);

  // Auto-expand hierarchy for selected daily note
  useEffect(() => {
    if (dailyNotesMode && selectedDailyNoteDate) {
      const date = parseISO(selectedDailyNoteDate);
      const year = format(date, 'yyyy');
      const month = format(date, 'yyyy-MM');
      
      setExpandedYears(prev => new Set([...prev, year]));
      setExpandedMonths(prev => new Set([...prev, month]));
    }
  }, [dailyNotesMode, selectedDailyNoteDate]);

  // Dynamic accent color styles
  const getAccentColorStyles = () => {
    const accentColor = state.preferences.accentColor;
    return {
      text: { color: accentColor },
      bg: { backgroundColor: accentColor },
      bgHover: { backgroundColor: accentColor + 'E6' }, // 90% opacity
      border: { borderColor: accentColor },
      ring: { '--tw-ring-color': accentColor },
      bgLight: { backgroundColor: accentColor + '1A' }, // 10% opacity
    };
  };

  // Get all note tags for filtering
  const noteTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach(note => {
      note.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [notes]);

  // Filter and sort notes
  const filteredNotes = useMemo(() => {
    let filtered = notes;

    // Apply daily notes filter based on mode
    if (dailyNotesMode) {
      // Show only daily notes
      filtered = filtered.filter(note => note.dailyNote);
    } else {
      // Show only regular notes (non-daily notes) and exclude email notes
      filtered = filtered.filter(note => !note.dailyNote && !note.tags.includes('email'));
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(note => 
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(note => 
        selectedTags.every(tag => note.tags.includes(tag))
      );
    }

    // Apply archive filter
    if (!showArchived) {
      filtered = filtered.filter(note => !note.archived);
    }

    // Apply sorting
    filtered = filtered.sort((a, b) => {
      if (sortBy === 'title') {
        return sortOrder === 'asc' ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title);
      } else if (sortBy === 'created') {
        return sortOrder === 'asc' ? 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() :
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else { // updated
        return sortOrder === 'asc' ? 
          new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime() :
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

    // Put pinned notes at the top
    const pinnedNotes = filtered.filter(note => note.pinned);
    const unpinnedNotes = filtered.filter(note => !note.pinned);
    
    return [...pinnedNotes, ...unpinnedNotes];
  }, [notes, searchQuery, selectedTags, sortBy, sortOrder, showArchived, dailyNotesMode]);

  const handleCreateNote = useCallback(() => {
    if (dailyNotesMode) {
      // In Daily Notes mode, create today's note
      const today = format(new Date(), 'yyyy-MM-dd');
      selectDailyNote(today);
    } else {
      // Normal note creation
      const newNote = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        title: '',
        content: '',
        tags: [],
        linkedTasks: [],
        linkedNotes: [],
        linkedProjects: [],
        pinned: false,
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      dispatch({ type: 'ADD_NOTE', payload: newNote });
      dispatch({ type: 'SELECT_NOTE', payload: newNote });
      dispatch({ type: 'SET_NOTES_EDITING', payload: true });
    }
  }, [dailyNotesMode, dispatch]);

  const handleNoteSelect = useCallback((note: Note) => {
    dispatch({ type: 'SELECT_NOTE', payload: note });
    dispatch({ type: 'SET_NOTES_EDITING', payload: false });
  }, [dispatch]);

  const handleArchiveNote = useCallback((e: React.MouseEvent, note: Note) => {
    e.stopPropagation(); // Prevent note selection
    if (note.archived) {
      // Unarchive note by updating it
      dispatch({ type: 'UPDATE_NOTE', payload: { ...note, archived: false } });
    } else {
      // Archive note
      dispatch({ type: 'ARCHIVE_NOTE', payload: note.id });
    }
  }, [dispatch]);

  // Daily Notes functions
  const toggleDailyNotesMode = () => {
    const newMode = !dailyNotesMode;
    dispatch({ type: 'SET_DAILY_NOTES_MODE', payload: newMode });
    
    if (newMode) {
      // Switch to daily notes mode - select today's note
      const today = format(new Date(), 'yyyy-MM-dd');
      selectDailyNote(today);
    } else {
      // Switch back to normal notes mode
      dispatch({ type: 'SET_SELECTED_DAILY_NOTE_DATE', payload: null });
    }
  };

  const selectDailyNote = (date: string) => {
    // Find existing daily note for this date (ignore archived notes)
    const existingNote = notes.find(note => note.dailyNote && note.dailyNoteDate === date && !note.archived);
    
    if (existingNote) {
      // Note exists, select it directly
      dispatch({ type: 'SET_SELECTED_DAILY_NOTE_DATE', payload: date });
      dispatch({ type: 'SELECT_NOTE', payload: existingNote });
      dispatch({ type: 'SET_NOTES_EDITING', payload: false });
    } else {
      // No note exists (or only archived notes), show confirmation modal
      setPendingDailyNoteDate(date);
      setShowDailyNoteConfirmation(true);
    }
  };

  const handleDailyNoteConfirmation = () => {
    if (!pendingDailyNoteDate) return;
    
    dispatch({ type: 'SET_SELECTED_DAILY_NOTE_DATE', payload: pendingDailyNoteDate });
    
    // Get the template from preferences
    const template = state.preferences.dailyNoteTemplate || '';
    const dateTitle = format(parseISO(pendingDailyNoteDate), 'EEEE, dd. MMMM yyyy', { locale: de });
    
    // Create new daily note with template
    const newNote = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      title: dateTitle,
      content: template ? template.replace(/\{date\}/g, dateTitle) : `# ${dateTitle}\n\n`,
      tags: ['daily'],
      linkedTasks: [],
      linkedNotes: [],
      linkedProjects: [],
      pinned: false,
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dailyNote: true,
      dailyNoteDate: pendingDailyNoteDate
    };
    
    dispatch({ type: 'ADD_NOTE', payload: newNote });
    dispatch({ type: 'SELECT_NOTE', payload: newNote });
    dispatch({ type: 'SET_NOTES_EDITING', payload: false });
    
    // Close modal
    setShowDailyNoteConfirmation(false);
    setPendingDailyNoteDate(null);
  };

  const handleDailyNoteCancel = () => {
    setShowDailyNoteConfirmation(false);
    setPendingDailyNoteDate(null);
  };

  const getDailyNoteForDate = (date: string) => {
    return notes.find(note => note.dailyNote && note.dailyNoteDate === date && !note.archived);
  };

  const navigateToDate = (direction: 'prev' | 'next') => {
    if (!selectedDailyNoteDate) return;
    
    const currentDate = parseISO(selectedDailyNoteDate);
    const newDate = direction === 'prev' ? subDays(currentDate, 1) : addDays(currentDate, 1);
    const newDateString = format(newDate, 'yyyy-MM-dd');
    
    selectDailyNote(newDateString);
  };

  const navigateToToday = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    selectDailyNote(today);
  };

  // Calendar functions
  const previousMonth = () => {
    setCurrentMonth(prev => subDays(startOfMonth(prev), 1));
  };

  const nextMonth = () => {
    setCurrentMonth(prev => addDays(endOfMonth(prev), 1));
  };

  const getCalendarDays = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    return eachDayOfInterval({ start: startDate, end: endDate });
  };

  const getDailyNotesCount = () => {
    return notes.filter(note => note.dailyNote && !note.archived).length;
  };

  const getRecentDailyNotes = () => {
    return notes
      .filter(note => note.dailyNote && !note.archived)
      .sort((a, b) => new Date(b.dailyNoteDate || b.createdAt).getTime() - new Date(a.dailyNoteDate || a.createdAt).getTime())
      .slice(0, 10);
  };

  // Group daily notes by year and month
  const getDailyNotesHierarchy = () => {
    const dailyNotes = notes
      .filter(note => note.dailyNote && !note.archived && note.dailyNoteDate)
      .sort((a, b) => new Date(b.dailyNoteDate!).getTime() - new Date(a.dailyNoteDate!).getTime());

    const hierarchy: Record<string, Record<string, Note[]>> = {};
    
    dailyNotes.forEach(note => {
      const date = parseISO(note.dailyNoteDate!);
      const year = format(date, 'yyyy');
      const month = format(date, 'yyyy-MM');
      
      if (!hierarchy[year]) {
        hierarchy[year] = {};
      }
      if (!hierarchy[year][month]) {
        hierarchy[year][month] = [];
      }
      hierarchy[year][month].push(note);
    });

    return hierarchy;
  };

  const toggleYear = (year: string) => {
    setExpandedYears(prev => {
      const newSet = new Set(prev);
      if (newSet.has(year)) {
        newSet.delete(year);
      } else {
        newSet.add(year);
      }
      return newSet;
    });
  };

  const toggleMonth = (month: string) => {
    setExpandedMonths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(month)) {
        newSet.delete(month);
      } else {
        newSet.add(month);
      }
      return newSet;
    });
  };



  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInHours < 1) {
      return 'Gerade eben';
    } else if (diffInHours < 24) {
      return `vor ${diffInHours} Std.`;
    } else if (diffInDays < 7) {
              return diffInDays === 1 
        ? t('notes_view.time_ago.days', { count: diffInDays })
        : t('notes_view.time_ago.days_plural', { count: diffInDays });
    } else {
      return format(date, 'dd.MM.yyyy', { locale: de });
    }
  };

  return (
    <div className="h-full w-full relative overflow-hidden">
      {/* Notes Sidebar - Full height, positioned from top to bottom */}
      {!state.isNoteEditorFullScreen && (
        <div className={`absolute top-0 left-0 bottom-0 w-80 z-20 flex flex-col overflow-hidden ${
          state.preferences.minimalDesign
            ? 'bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700'
            : `backdrop-blur-xl ${document.documentElement.classList.contains('dark') ? 'bg-black/50' : 'bg-white/30'} border-r ${document.documentElement.classList.contains('dark') ? 'border-white/15' : 'border-gray-200'}`
        }`}
                  style={{
          boxShadow: state.preferences.minimalDesign 
            ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            : '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          transform: sidebarVisible ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 500ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
        >
          {/* Header */}
                    <div 
            className={`flex flex-col justify-center px-4 ${
            state.preferences.minimalDesign
              ? 'border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
              : 'border-b border-white/15 bg-transparent'
            }`}
            style={{ 
              height: '80px',
              minHeight: '80px',
              maxHeight: '80px',
              boxSizing: 'border-box'
            }}
          >
            <div className="flex items-center justify-between">
              <h1 className={`text-lg font-semibold flex items-center space-x-2 ${
                state.preferences.minimalDesign
                  ? 'text-gray-900 dark:text-white'
                  : 'text-white'
              }`}>
                <FileText className="w-5 h-5" style={getAccentColorStyles().text} />
                <span>{notesView.notes()}</span>
              </h1>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCreateNote}
                  className={`p-2 rounded-md transition-colors duration-200 shadow-sm ${
                    state.preferences.minimalDesign
                      ? 'text-white'
                      : 'text-white'
                  }`}
                  style={state.preferences.minimalDesign 
                    ? { backgroundColor: state.preferences.accentColor }
                    : getAccentColorStyles().bg
                  }
                  onMouseEnter={(e) => {
                    if (state.preferences.minimalDesign) {
                      const color = state.preferences.accentColor;
                      // Darken the accent color for hover
                      const rgb = color.match(/\w\w/g)?.map(x => parseInt(x, 16));
                      if (rgb) {
                        const darkerColor = `rgb(${Math.max(0, rgb[0] - 20)}, ${Math.max(0, rgb[1] - 20)}, ${Math.max(0, rgb[2] - 20)})`;
                        e.currentTarget.style.backgroundColor = darkerColor;
                      }
                    } else {
                      e.currentTarget.style.backgroundColor = getAccentColorStyles().bgHover.backgroundColor;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (state.preferences.minimalDesign) {
                      e.currentTarget.style.backgroundColor = state.preferences.accentColor;
                    } else {
                      e.currentTarget.style.backgroundColor = getAccentColorStyles().bg.backgroundColor;
                    }
                  }}
                  title="Neue Notiz erstellen"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            </div>

          {/* Mode Toggle - Below the line */}
          <div className="p-4">
              <div className={`rounded-lg p-1 flex ${
                state.preferences.minimalDesign
                  ? 'bg-gray-100 dark:bg-gray-700'
                  : 'bg-gray-800'
              }`}>
                <button
                  onClick={() => {
                    if (dailyNotesMode) {
                      toggleDailyNotesMode();
                    }
                  }}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
                    !dailyNotesMode
                      ? state.preferences.minimalDesign
                        ? 'text-white shadow-sm'
                        : 'text-white shadow-sm'
                      : state.preferences.minimalDesign
                        ? 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                        : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
                  }`}
                  style={!dailyNotesMode 
                    ? state.preferences.minimalDesign 
                      ? { backgroundColor: state.preferences.accentColor }
                      : getAccentColorStyles().bg
                    : {}
                  }
                >
                  <BookOpen className="w-4 h-4" />
                  <span>{t('notes_view.notes')}</span>
                </button>
                <button
                  onClick={() => {
                    if (!dailyNotesMode) {
                      toggleDailyNotesMode();
                    }
                  }}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
                    dailyNotesMode
                      ? state.preferences.minimalDesign
                        ? 'text-white shadow-sm'
                        : 'text-white shadow-sm'
                      : state.preferences.minimalDesign
                        ? 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                        : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
                  }`}
                  style={dailyNotesMode 
                    ? state.preferences.minimalDesign 
                      ? { backgroundColor: state.preferences.accentColor }
                      : getAccentColorStyles().bg
                    : {}
                  }
                >
                  <Calendar className="w-4 h-4" />
                  <span>{notesView.dailyNotes()}</span>
                </button>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-end mt-4">
              <span className={`text-xs ${
                state.preferences.minimalDesign
                  ? 'text-gray-500 dark:text-gray-400'
                  : 'text-gray-400'
              }`}>
                {filteredNotes.length === 1 
                  ? t('notes_view.notes_count', { count: filteredNotes.length })
                  : t('notes_view.notes_count_plural', { count: filteredNotes.length })
                }
              </span>
            </div>
          </div>

          {/* Daily Notes Section */}
          {dailyNotesMode && (
            <div className={`p-4 space-y-4 ${
              state.preferences.minimalDesign
                ? 'border-b border-gray-200 dark:border-gray-700'
                : 'border-b border-gray-800'
            }`}>
              {/* Quick Navigation */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => navigateToDate('prev')}
                    className="p-1 text-gray-400 hover:text-gray-300 rounded"
                    title={notesView.previousDay()}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium text-white">
                    {selectedDailyNoteDate 
                      ? format(parseISO(selectedDailyNoteDate), 'EEE, dd.MM.yyyy', { locale: de })
                      : notesView.noDaySelected()
                    }
                  </span>
                  <button
                    onClick={() => navigateToDate('next')}
                    className="p-1 text-gray-400 hover:text-gray-300 rounded"
                    title={notesView.nextDay()}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={navigateToToday}
                    className="px-2 py-1 text-xs bg-gray-700 text-gray-300 hover:bg-gray-600 rounded"
                    title={actions.today()}
                  >
                    <Home className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Calendar */}
              <div className={`rounded-lg p-4 ${
                state.preferences.minimalDesign
                  ? 'bg-gray-100 dark:bg-gray-700'
                  : 'bg-gray-800'
              }`}>
                  <div className="flex items-center justify-between mb-3">
                    <button 
                      onClick={previousMonth}
                      className="p-1 text-gray-400 hover:text-gray-300 rounded"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <h3 className={`text-sm font-semibold ${
                      state.preferences.minimalDesign
                        ? 'text-gray-900 dark:text-white'
                        : 'text-white'
                    }`}>
                      {format(currentMonth, 'MMMM yyyy', { locale: de })}
                    </h3>
                    <button 
                      onClick={nextMonth}
                      className="p-1 text-gray-400 hover:text-gray-300 rounded"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1 text-xs">
                    {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => (
                      <div key={day} className="text-center text-gray-400 py-1">
                        {day}
                      </div>
                    ))}
                    {getCalendarDays().map(day => {
                      const dateString = format(day, 'yyyy-MM-dd');
                      const hasNote = getDailyNoteForDate(dateString) !== undefined;
                      const isSelected = selectedDailyNoteDate === dateString;
                      const isCurrentMonth = isSameMonth(day, currentMonth);
                      const isToday = isSameDay(day, new Date());
                      
                      return (
                        <button
                          key={day.getTime()}
                          onClick={() => selectDailyNote(dateString)}
                          className={`
                            h-8 w-8 text-xs rounded transition-colors relative
                            ${isCurrentMonth ? 'text-white' : 'text-gray-600'}
                            ${isToday ? 'bg-gray-700 font-semibold' : ''}
                            ${isSelected ? 'text-white' : ''}
                            ${!isSelected && isCurrentMonth ? 'hover:bg-gray-700' : ''}
                            ${!isCurrentMonth ? 'hover:bg-gray-800' : ''}
                          `}
                          style={isSelected ? getAccentColorStyles().bg : {}}
                          title={`${format(day, 'dd.MM.yyyy')}${hasNote ? ' - Notiz vorhanden' : ''}`}
                        >
                          {format(day, 'd')}
                          {hasNote && (
                            <div 
                              className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                              style={getAccentColorStyles().bg}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

              {/* Hierarchical Daily Notes */}
              <div className="space-y-1">
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                  {notesView.allEntries()}
                </h3>
                {(() => {
                  const hierarchy = getDailyNotesHierarchy();
                  const years = Object.keys(hierarchy).sort((a, b) => b.localeCompare(a));
                  
                  return years.map(year => {
                    const isYearExpanded = expandedYears.has(year);
                    const months = Object.keys(hierarchy[year]).sort((a, b) => b.localeCompare(a));
                    const totalNotesInYear = Object.values(hierarchy[year]).flat().length;
                    
                    return (
                      <div key={year}>
                        {/* Year Header */}
                        <div
                          onClick={() => toggleYear(year)}
                          className="flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-800"
                        >
                          <div className="flex items-center space-x-2">
                            {isYearExpanded ? (
                              <ChevronDown className="w-3 h-3 text-gray-400" />
                            ) : (
                              <ChevronRight className="w-3 h-3 text-gray-400" />
                            )}
                            <span className="text-sm font-medium text-white">{year}</span>
                          </div>
                          <span className="text-xs text-gray-400">{totalNotesInYear}</span>
                        </div>
                        
                        {/* Months */}
                        {isYearExpanded && (
                          <div className="ml-4 space-y-1">
                            {months.map(month => {
                              const isMonthExpanded = expandedMonths.has(month);
                              const monthDate = parseISO(month + '-01');
                              const monthName = format(monthDate, 'MMMM', { locale: de });
                              const notesInMonth = hierarchy[year][month];
                              
                              return (
                                <div key={month}>
                                  {/* Month Header */}
                                  <div
                                    onClick={() => toggleMonth(month)}
                                    className="flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-800"
                                  >
                                    <div className="flex items-center space-x-2">
                                      {isMonthExpanded ? (
                                        <ChevronDown className="w-3 h-3 text-gray-400" />
                                      ) : (
                                        <ChevronRight className="w-3 h-3 text-gray-400" />
                                      )}
                                      <span className="text-sm text-gray-300">{monthName}</span>
                                    </div>
                                    <span className="text-xs text-gray-400">{notesInMonth.length}</span>
                                  </div>
                                  
                                  {/* Daily Notes */}
                                  {isMonthExpanded && (
                                    <div className="ml-4 space-y-1">
                                      {notesInMonth.map(note => (
                                        <div
                                          key={note.id}
                                          onClick={() => selectDailyNote(note.dailyNoteDate!)}
                                          className={`group p-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-800 ${
                                            selectedDailyNoteDate === note.dailyNoteDate 
                                              ? 'border-l-2' 
                                              : ''
                                          }`}
                                          style={selectedDailyNoteDate === note.dailyNoteDate ? { 
                                            borderLeftColor: getAccentColorStyles().border.borderColor,
                                            backgroundColor: getAccentColorStyles().bg.backgroundColor + '15'
                                          } : {}}
                                        >
                                          <div className="flex items-center space-x-2 min-w-0">
                                            <Calendar className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                            <div className="min-w-0 flex-1">
                                              <div className="text-xs font-medium text-white truncate">
                                                {format(parseISO(note.dailyNoteDate!), 'EEE, dd.', { locale: de })}
                                              </div>
                                            </div>
                                            <div className="text-xs text-gray-400">
                                              {getRelativeTime(note.updatedAt)}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* Notes List */}
          <div className="flex-1 overflow-y-auto">
            {(() => {
              const pinnedNotes = filteredNotes.filter(note => note.pinned);
              const regularNotes = filteredNotes.filter(note => !note.pinned);
              
              return (
                <>
                  {/* Favoriten Section */}
                  {pinnedNotes.length > 0 && (
                    <div className={`border-b ${
                      state.preferences.minimalDesign
                        ? 'border-gray-200 dark:border-gray-700'
                        : 'border-gray-800'
                    }`}>
                      <div 
                        className={`px-4 py-3 cursor-pointer transition-colors ${
                          state.preferences.minimalDesign
                            ? 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                            : 'bg-gray-800/50 hover:bg-gray-800/70'
                        }`}
                        onClick={() => setFavoritesExpanded(!favoritesExpanded)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {favoritesExpanded ? (
                              <ChevronDown className={`w-4 h-4 ${
                              state.preferences.minimalDesign
                                ? 'text-gray-600 dark:text-gray-400'
                                : 'text-gray-400'
                            }`} />
                            ) : (
                              <ChevronRight className={`w-4 h-4 ${
                                state.preferences.minimalDesign
                                  ? 'text-gray-600 dark:text-gray-400'
                                  : 'text-gray-400'
                              }`} />
                            )}
                            <Pin className="w-4 h-4" style={getAccentColorStyles().text} />
                            <h2 className={`text-sm font-semibold ${
                              state.preferences.minimalDesign
                                ? 'text-gray-900 dark:text-white'
                                : 'text-white'
                            }`}>Favoriten</h2>
                          </div>
                          <span className={`text-xs ${
                            state.preferences.minimalDesign
                              ? 'text-gray-500 dark:text-gray-400'
                              : 'text-gray-400'
                          }`}>{pinnedNotes.length}</span>
                        </div>
                      </div>
                      {favoritesExpanded && pinnedNotes.map((note) => (
                        <div
                          key={note.id}
                          onClick={() => handleNoteSelect(note)}
                          className={`group p-4 cursor-pointer transition-colors relative ${
                            state.preferences.minimalDesign
                              ? `border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700`
                              : `border-b border-gray-800 hover:bg-gray-800`
                          } ${
                            selectedNote?.id === note.id 
                              ? 'border-l-4' 
                              : ''
                          }`}
                          style={selectedNote?.id === note.id ? { 
                            borderLeftColor: getAccentColorStyles().border.borderColor,
                            backgroundColor: getAccentColorStyles().bgLight.backgroundColor
                          } : {}}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              <FileText className={`w-4 h-4 flex-shrink-0 ${
                                state.preferences.minimalDesign
                                  ? 'text-gray-600 dark:text-gray-400'
                                  : 'text-gray-400'
                              }`} />
                              <h3 className={`font-medium text-sm truncate ${
                                state.preferences.minimalDesign
                                  ? 'text-gray-900 dark:text-white'
                                  : 'text-white'
                              }`}>
                                {note.title || 'Unbenannte Notiz'}
                              </h3>
                            </div>
                            <div className="flex items-center space-x-1 ml-2">
                              <Pin className="w-3 h-3" style={getAccentColorStyles().text} />
                              {note.archived && <Archive className={`w-3 h-3 ${
                                state.preferences.minimalDesign
                                  ? 'text-gray-600 dark:text-gray-400'
                                  : 'text-gray-400'
                              }`} />}
                              {note.linkedTasks.length > 0 && <Link className="w-3 h-3" style={getAccentColorStyles().text} />}
                            </div>
                          </div>
                          
                          {/* Archive Button - appears on hover */}
                          <button
                            onClick={(e) => handleArchiveNote(e, note)}
                            className="absolute top-2 right-2 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-gray-700"
                            style={getAccentColorStyles().text}
                            title={note.archived ? t('notes_view.restore_from_archive') : t('notes_view.archive')}
                          >
                            {note.archived ? (
                              <RotateCcw className="w-4 h-4" />
                            ) : (
                              <Archive className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* All Notes Section */}
                  {regularNotes.length > 0 && (
                    <div>
                      <div 
                        className={`px-4 py-3 cursor-pointer transition-colors ${
                          state.preferences.minimalDesign
                            ? 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                            : 'bg-gray-800/50 hover:bg-gray-800/70'
                        }`}
                        onClick={() => setAllNotesExpanded(!allNotesExpanded)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {allNotesExpanded ? (
                              <ChevronDown className={`w-4 h-4 ${
                                state.preferences.minimalDesign
                                  ? 'text-gray-600 dark:text-gray-400'
                                  : 'text-gray-400'
                              }`} />
                            ) : (
                              <ChevronRight className={`w-4 h-4 ${
                                state.preferences.minimalDesign
                                  ? 'text-gray-600 dark:text-gray-400'
                                  : 'text-gray-400'
                              }`} />
                            )}
                            <FileText className="w-4 h-4" style={getAccentColorStyles().text} />
                            <h2 className={`text-sm font-semibold ${
                              state.preferences.minimalDesign
                                ? 'text-gray-900 dark:text-white'
                                : 'text-white'
                            }`}>
                              {dailyNotesMode ? notesView.dailyNotes() : notesView.allNotes()}
                            </h2>
                          </div>
                          <span className={`text-xs ${
                            state.preferences.minimalDesign
                              ? 'text-gray-500 dark:text-gray-400'
                              : 'text-gray-400'
                          }`}>{regularNotes.length}</span>
                        </div>
                      </div>
                      {allNotesExpanded && regularNotes.map((note) => (
                        <div
                          key={note.id}
                          onClick={() => handleNoteSelect(note)}
                          className={`group p-4 cursor-pointer transition-colors relative ${
                            state.preferences.minimalDesign
                              ? `border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700`
                              : `border-b border-gray-800 hover:bg-gray-800`
                          } ${
                            selectedNote?.id === note.id 
                              ? 'border-l-4' 
                              : ''
                          }`}
                          style={selectedNote?.id === note.id ? { 
                            borderLeftColor: getAccentColorStyles().border.borderColor,
                            backgroundColor: getAccentColorStyles().bgLight.backgroundColor
                          } : {}}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              <FileText className={`w-4 h-4 flex-shrink-0 ${
                                state.preferences.minimalDesign
                                  ? 'text-gray-600 dark:text-gray-400'
                                  : 'text-gray-400'
                              }`} />
                              <h3 className={`font-medium text-sm truncate ${
                                state.preferences.minimalDesign
                                  ? 'text-gray-900 dark:text-white'
                                  : 'text-white'
                              }`}>
                                {note.title || 'Unbenannte Notiz'}
                              </h3>
                            </div>
                            <div className="flex items-center space-x-1 ml-2">
                              {note.archived && <Archive className="w-3 h-3 text-gray-400" />}
                              {note.linkedTasks.length > 0 && <Link className="w-3 h-3" style={getAccentColorStyles().text} />}
                            </div>
                          </div>
                          
                          {/* Archive Button - appears on hover */}
                          <button
                            onClick={(e) => handleArchiveNote(e, note)}
                            className="absolute top-2 right-2 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-gray-700"
                            style={getAccentColorStyles().text}
                            title={note.archived ? 'Aus Archiv wiederherstellen' : 'Archivieren'}
                          >
                            {note.archived ? (
                              <RotateCcw className="w-4 h-4" />
                            ) : (
                              <Archive className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
            
            {filteredNotes.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="w-12 h-12 bg-gray-700 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
                  {dailyNotesMode ? (
                    <Calendar className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                  ) : (
                    <FileText className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                  )}
                </div>
                <h3 className="text-base font-medium text-white mb-2">
                  {searchQuery || selectedTags.length > 0 
                                ? notesView.noNotesFound()
            : (dailyNotesMode ? notesView.noDailyNotes() : notesView.noNotesAvailable())
                  }
                </h3>
                <p className="text-sm text-gray-400 mb-4 max-w-md">
                  {searchQuery || selectedTags.length > 0 
                    ? notesView.noNotesMatchFilter() 
                    : (dailyNotesMode 
                                              ? notesView.createFirstDailyNote() 
                        : notesView.createFirstNote()
                    )
                  }
                </p>
                {!(searchQuery || selectedTags.length > 0) && (
                                      <button
                      onClick={handleCreateNote}
                      className={`px-4 py-2 rounded-md transition-colors flex items-center space-x-2 text-sm font-medium ${
                        state.preferences.minimalDesign
                          ? 'text-white shadow-lg hover:shadow-xl'
                          : 'text-white'
                      }`}
                      style={state.preferences.minimalDesign 
                        ? { backgroundColor: state.preferences.accentColor }
                        : getAccentColorStyles().bg
                      }
                      onMouseEnter={(e) => {
                        if (state.preferences.minimalDesign) {
                          const color = state.preferences.accentColor;
                          // Darken the accent color for hover
                          const rgb = color.match(/\w\w/g)?.map(x => parseInt(x, 16));
                          if (rgb) {
                            const darkerColor = `rgb(${Math.max(0, rgb[0] - 20)}, ${Math.max(0, rgb[1] - 20)}, ${Math.max(0, rgb[2] - 20)})`;
                            e.currentTarget.style.backgroundColor = darkerColor;
                          }
                        } else {
                          e.currentTarget.style.backgroundColor = getAccentColorStyles().bgHover.backgroundColor;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (state.preferences.minimalDesign) {
                          e.currentTarget.style.backgroundColor = state.preferences.accentColor;
                        } else {
                          e.currentTarget.style.backgroundColor = getAccentColorStyles().bg.backgroundColor;
                        }
                      }}
                    >
                      <Plus className="w-4 h-4" />
                      <span>{dailyNotesMode ? notesView.createFirstDailyNoteButton() : notesView.createFirstNoteButton()}</span>
                    </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area - Positioned to the right of sidebar */}
      <div className="absolute top-0 right-0 bottom-0 flex flex-col overflow-hidden"
        style={{
          left: !state.isNoteEditorFullScreen && sidebarVisible ? '320px' : '0px', // 320px = w-80
          transition: 'left 500ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
      >
        {/* Header - Only extends to the right of the notes sidebar */}
        <div className="flex-shrink-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200/60 dark:border-gray-700/60 shadow-sm">
          <Header currentView="notes" />
        </div>

        {/* Main Editor Area */}
        <div className="flex-1 overflow-hidden">
          <NoteEditor onFullScreenToggle={handleFullScreenToggle} />
        </div>
      </div>

      {/* Daily Note Confirmation Modal */}
      <DailyNoteConfirmationModal
        isOpen={showDailyNoteConfirmation}
        onClose={handleDailyNoteCancel}
        onConfirm={handleDailyNoteConfirmation}
        date={pendingDailyNoteDate || ''}
        formattedDate={pendingDailyNoteDate ? format(parseISO(pendingDailyNoteDate), 'EEEE, dd. MMMM yyyy', { locale: de }) : ''}
      />
    </div>
  );
} 