import React, { useState, useMemo } from 'react';
import { X, Mail, Search, Calendar, User, Clock, ArrowRight, FileText } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Note } from '../../types';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

interface EmailLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmail: (email: Note) => void;
  title?: string;
  showEmailsOnly?: boolean; // New prop to control if only emails should be shown
}

export function EmailLinkModal({ isOpen, onClose, onSelectEmail, title = "Notiz verlinken", showEmailsOnly = false }: EmailLinkModalProps) {
  const { state } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  // Dynamic accent color styles - ALWAYS call hooks
  const getAccentColorStyles = () => {
    const accentColor = state.preferences.accentColor;
    return {
      text: { color: accentColor },
      bg: { backgroundColor: accentColor },
      bgHover: { backgroundColor: accentColor + 'E6' },
      bgLight: { backgroundColor: accentColor + '1A' },
      border: { borderColor: accentColor },
      ring: { '--tw-ring-color': accentColor },
    };
  };

  // Get all email notes or all notes based on showEmailsOnly - ALWAYS call useMemo
  const availableNotes = useMemo(() => {
    const notes = state.notes.notes.filter(note => {
      if (note.archived) return false;
      
      if (showEmailsOnly) {
        return note.tags.includes('email') && note.metadata?.contentType === 'html';
      } else {
        return true; // Show all non-archived notes
      }
    });
    
    return notes.sort((a, b) => {
      // Sort emails first if mixed mode, then by date
      if (!showEmailsOnly) {
        const aIsEmail = a.tags.includes('email');
        const bIsEmail = b.tags.includes('email');
        if (aIsEmail && !bIsEmail) return -1;
        if (!aIsEmail && bIsEmail) return 1;
      }
      
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [state.notes.notes, showEmailsOnly]);

  // Filter notes based on search query
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return availableNotes;
    
    const query = searchQuery.toLowerCase();
    return availableNotes.filter(note => {
      const title = note.title.toLowerCase();
      const content = note.content.toLowerCase();
      const emailSubject = note.metadata?.emailMetadata?.originalSubject?.toLowerCase() || '';
      const emailFrom = note.metadata?.emailMetadata?.from.email?.toLowerCase() || '';
      
      return title.includes(query) || 
             content.includes(query) || 
             emailSubject.includes(query) || 
             emailFrom.includes(query);
    });
  }, [availableNotes, searchQuery]);

  const handleEmailSelect = (email: Note) => {
    onSelectEmail(email);
    onClose();
  };

  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Format email preview data
  const formatEmailPreview = (note: Note) => {
    if (note.tags.includes('email') && note.metadata?.emailMetadata) {
      const metadata = note.metadata.emailMetadata;
      return {
        subject: metadata.originalSubject || note.title.replace('📧 ', ''),
        from: metadata.from.name || metadata.from.email,
        date: format(new Date(metadata.date), 'dd.MM.yyyy HH:mm', { locale: de }),
        isEmail: true
      };
    } else {
      // Regular note
      const preview = note.content.substring(0, 100).replace(/[#*`\[\]]/g, '').trim() || 'Keine Vorschau verfügbar';
      return {
        subject: note.title || 'Untitled Note',
        from: preview,
        date: format(new Date(note.updatedAt), 'dd.MM.yyyy HH:mm', { locale: de }),
        isEmail: false
      };
    }
  };

  // Early return if modal is not open - AFTER all hooks have been called
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden"
        onClick={handleModalClick}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg" style={getAccentColorStyles().bgLight}>
              <Mail className="w-5 h-5" style={getAccentColorStyles().text} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {filteredNotes.length} {showEmailsOnly ? 'E-Mails' : (filteredNotes.length === 1 ? 'Notiz' : 'Notizen')} verfügbar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={showEmailsOnly ? "E-Mails durchsuchen..." : "Notizen und E-Mails durchsuchen..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:border-transparent transition-colors"
              style={{
                '--tw-ring-color': getAccentColorStyles().ring['--tw-ring-color']
              } as React.CSSProperties}
            />
          </div>
        </div>

        {/* Email List */}
        <div className="flex-1 overflow-y-auto max-h-96">
          {filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
                {showEmailsOnly ? (
                  <Mail className="w-6 h-6 text-gray-400" />
                ) : (
                  <FileText className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {searchQuery.trim() 
                  ? `Keine ${showEmailsOnly ? 'E-Mails' : 'Notizen'} gefunden`
                  : `Keine ${showEmailsOnly ? 'E-Mails' : 'Notizen'} verfügbar`
                }
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {searchQuery.trim() 
                  ? `Versuchen Sie einen anderen Suchbegriff.`
                  : `${showEmailsOnly ? 'Importieren Sie E-Mails' : 'Erstellen Sie Notizen'}, um sie hier zu verlinken.`
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredNotes.map((note) => {
                const preview = formatEmailPreview(note);
                
                return (
                  <button
                    key={note.id}
                    onClick={() => handleEmailSelect(note)}
                    className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        {/* Note/Email Title */}
                        <div className="flex items-center space-x-2 mb-1">
                          <div className="p-1 rounded" style={getAccentColorStyles().bgLight}>
                            {preview.isEmail ? (
                              <Mail className="w-3 h-3" style={getAccentColorStyles().text} />
                            ) : (
                              <FileText className="w-3 h-3" style={getAccentColorStyles().text} />
                            )}
                          </div>
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate transition-colors"
                            style={{
                              color: 'inherit'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = getAccentColorStyles().text.color;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = 'inherit';
                            }}
                          >
                            {preview.isEmail ? '📧' : '📝'} {preview.subject}
                          </h4>
                        </div>

                        {/* Meta Information */}
                        <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400 mb-2">
                          <div className="flex items-center space-x-1">
                            {preview.isEmail ? <User className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            <span className="truncate max-w-32">{preview.from}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{preview.date}</span>
                          </div>
                        </div>

                        {/* Tags */}
                        {note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {note.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                              >
                                {tag}
                              </span>
                            ))}
                            {note.tags.length > 3 && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                +{note.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Arrow Icon */}
                      <div className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>E-Mail auswählen zum Verlinken</span>
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 