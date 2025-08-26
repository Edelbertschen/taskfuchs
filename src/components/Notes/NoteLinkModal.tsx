import React, { useState, useMemo, useCallback } from 'react';
import { Search, X, Filter, Hash, Clock, Calendar, FileText, Mail, BookOpen } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAppTranslation } from '../../utils/i18nHelpers';
import { useTranslation } from 'react-i18next';
import type { Note } from '../../types';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface NoteLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLinkNote: (noteId: string) => void;
  excludeNoteIds: string[];
}

export function NoteLinkModal({ isOpen, onClose, onLinkNote, excludeNoteIds }: NoteLinkModalProps) {
  const { state } = useApp();
  const { notesView } = useAppTranslation();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['notes', 'dailynotes', 'emails']);

  // Dynamic accent color styles
  const getAccentColorStyles = () => {
    const accentColor = state.preferences.accentColor;
    return {
      text: { color: accentColor },
      bg: { backgroundColor: accentColor },
      ring: { '--tw-ring-color': accentColor },
    };
  };

  // Helper functions to categorize notes
  const getNoteType = (note: Note): 'email' | 'dailynote' | 'note' => {
    if (note.tags.includes('email')) return 'email';
    if (note.tags.includes('daily-note') || note.title.match(/^\d{4}-\d{2}-\d{2}/)) return 'dailynote';
    return 'note';
  };

  const getNoteIcon = (type: 'email' | 'dailynote' | 'note') => {
    switch (type) {
      case 'email': return Mail;
      case 'dailynote': return BookOpen;
      default: return FileText;
    }
  };

  const getNoteTypeLabel = (type: 'email' | 'dailynote' | 'note') => {
    switch (type) {
      case 'email': return 'E-Mail';
      case 'dailynote': return 'Daily Note';
      default: return 'Notiz';
    }
  };

  // Filter available notes
  const availableNotes = useMemo(() => {
    let filtered = state.notes.notes.filter(note => 
      !excludeNoteIds.includes(note.id) && !note.archived
    );

    // Type filter
    if (selectedTypes.length > 0 && selectedTypes.length < 3) {
      filtered = filtered.filter(note => {
        const noteType = getNoteType(note);
        return (selectedTypes.includes('notes') && noteType === 'note') ||
               (selectedTypes.includes('dailynotes') && noteType === 'dailynote') ||
               (selectedTypes.includes('emails') && noteType === 'email');
      });
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(note =>
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (note.content && note.content.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Pinned filter
    if (showPinnedOnly) {
      filtered = filtered.filter(note => note.pinned);
    }

    // Tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(note =>
        selectedTags.some(tag => note.tags.includes(tag))
      );
    }

    return filtered.sort((a, b) => {
      // Sort by type first (emails, then daily notes, then regular notes)
      const typeA = getNoteType(a);
      const typeB = getNoteType(b);
      const typeOrder = { email: 0, dailynote: 1, note: 2 };
      if (typeOrder[typeA] !== typeOrder[typeB]) {
        return typeOrder[typeA] - typeOrder[typeB];
      }

      // Then by pinned
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      
      // Then by updatedAt (most recent first)
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [state.notes.notes, excludeNoteIds, searchQuery, selectedTags, showPinnedOnly, selectedTypes]);

  // Get all available tags
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    state.notes.notes.forEach(note => {
      note.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [state.notes.notes]);

  const handleNoteSelect = useCallback((note: Note) => {
    onLinkNote(note.id);
    onClose();
  }, [onLinkNote, onClose]);

  const handleTagToggle = useCallback((tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  }, []);

  const handleTypeToggle = useCallback((type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedTags([]);
    setShowPinnedOnly(false);
    setSelectedTypes(['notes', 'dailynotes', 'emails']);
  }, []);

  const getContentPreview = (content: string | undefined) => {
    if (!content) return '';
    // Remove markdown formatting for preview
    return content
      .replace(/[#*_`~]/g, '')
      .replace(/\n/g, ' ')
      .substring(0, 100);
  };

  const formatReadingTime = (wordCount: number) => {
    if (!wordCount || wordCount === 0) return null;
    const minutes = Math.ceil(wordCount / 200); // ~200 words per minute
    return `${minutes} min`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Notiz verknüpfen
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search and Filters */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={notesView.searchNotes()}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:border-transparent"
              style={{
                '--tw-ring-color': getAccentColorStyles().ring['--tw-ring-color']
              } as React.CSSProperties}
            />
          </div>

          {/* Filter Toggle */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all ${
                showFilters || showPinnedOnly || selectedTags.length > 0 || selectedTypes.length < 3
                  ? 'text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              style={showFilters || showPinnedOnly || selectedTags.length > 0 || selectedTypes.length < 3 ? getAccentColorStyles().bg : {}}
            >
              <Filter className="w-4 h-4" />
              <span>{notesView.filter()}</span>
              {(showPinnedOnly || selectedTags.length > 0 || selectedTypes.length < 3) && (
                <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded">
                  {(showPinnedOnly ? 1 : 0) + selectedTags.length + (selectedTypes.length < 3 ? 1 : 0)}
                </span>
              )}
            </button>

            <div className="text-sm text-gray-500 dark:text-gray-400">
              {availableNotes.length} von {state.notes.notes.filter(n => !n.archived && !excludeNoteIds.includes(n.id)).length} {notesView.notes()}
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="space-y-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {notesView.type()}
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleTypeToggle('notes')}
                    className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm transition-all ${
                      selectedTypes.includes('notes')
                        ? 'text-white'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                    }`}
                    style={selectedTypes.includes('notes') ? getAccentColorStyles().bg : {}}
                  >
                    <FileText className="w-3 h-3" />
                    <span>{notesView.notes()}</span>
                  </button>
                  <button
                    onClick={() => handleTypeToggle('dailynotes')}
                    className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm transition-all ${
                      selectedTypes.includes('dailynotes')
                        ? 'text-white'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                    }`}
                    style={selectedTypes.includes('dailynotes') ? getAccentColorStyles().bg : {}}
                  >
                    <BookOpen className="w-3 h-3" />
                    <span>Daily Notes</span>
                  </button>
                  <button
                    onClick={() => handleTypeToggle('emails')}
                    className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm transition-all ${
                      selectedTypes.includes('emails')
                        ? 'text-white'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                    }`}
                    style={selectedTypes.includes('emails') ? getAccentColorStyles().bg : {}}
                  >
                    <Mail className="w-3 h-3" />
                    <span>E-Mails</span>
                  </button>
                </div>
              </div>

              {/* Pinned Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setShowPinnedOnly(!showPinnedOnly)}
                    className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm transition-all ${
                      showPinnedOnly
                        ? 'text-white'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                    }`}
                    style={showPinnedOnly ? getAccentColorStyles().bg : {}}
                  >
                    <Hash className="w-3 h-3" />
                    <span>Nur angeheftete</span>
                  </button>
                </div>
              </div>

              {/* Tag Filter */}
              {availableTags.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                    {availableTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => handleTagToggle(tag)}
                        className={`px-2 py-1 rounded text-sm transition-all ${
                          selectedTags.includes(tag)
                            ? 'text-white'
                            : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                        }`}
                        style={selectedTags.includes(tag) ? getAccentColorStyles().bg : {}}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Clear Filters */}
              {(showPinnedOnly || selectedTags.length > 0 || selectedTypes.length < 3) && (
                <button
                  onClick={clearFilters}
                  className="text-sm transition-colors"
                  style={getAccentColorStyles().text}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.8';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  Alle Filter entfernen
                </button>
              )}
            </div>
          )}
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto p-6">
          {availableNotes.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {notesView.noNotesFound()}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery || showPinnedOnly || selectedTags.length > 0
                  ? notesView.tryOtherSearch()
                  : notesView.allNotesLinked()}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableNotes.map(note => {
                const noteType = getNoteType(note);
                const NoteIcon = getNoteIcon(noteType);
                const typeLabel = getNoteTypeLabel(noteType);
                
                return (
                  <div
                    key={note.id}
                    onClick={() => handleNoteSelect(note)}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-all hover:shadow-md group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2 flex-1">
                        <NoteIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                          noteType === 'email' ? 'text-blue-500' : 
                          noteType === 'dailynote' ? 'text-green-500' : 
                          'text-gray-400'
                        }`} />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium text-gray-900 dark:text-white transition-colors" 
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = getAccentColorStyles().text.color;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = '';
                              }}
                            >
                              {note.title}
                            </h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              noteType === 'email' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                              noteType === 'dailynote' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                              'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {typeLabel}
                            </span>
                          </div>
                        </div>
                        {note.pinned && (
                          <Hash className="w-4 h-4" style={getAccentColorStyles().text} />
                        )}
                      </div>
                    </div>

                    {note.content && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                        {getContentPreview(note.content)}
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{format(new Date(note.updatedAt), 'dd.MM.yyyy', { locale: de })}</span>
                        </div>
                        {note.metadata?.wordCount && note.metadata.wordCount > 0 && (
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatReadingTime(note.metadata.wordCount)}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {note.tags.filter(tag => tag !== 'email' && tag !== 'daily-note').slice(0, 3).map(tag => (
                          <span
                            key={tag}
                            className="px-1.5 py-0.5 rounded text-xs"
                            style={{
                              backgroundColor: getAccentColorStyles().bg.backgroundColor + '1A', // 10% opacity
                              color: getAccentColorStyles().text.color
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                        {note.tags.filter(tag => tag !== 'email' && tag !== 'daily-note').length > 3 && (
                          <span className="text-xs text-gray-400">+{note.tags.filter(tag => tag !== 'email' && tag !== 'daily-note').length - 3}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 