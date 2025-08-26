import React from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { FileText, Star, Calendar, Eye } from 'lucide-react';

export function PinnedNotesWidget() {
  const { state } = useApp();
  const { t } = useTranslation();

  // Get pinned notes
  const pinnedNotes = (Array.isArray(state.notes?.notes) ? state.notes.notes : []).filter(note => note.pinned && !note.archived);

  // Handle note click
  const handleNoteClick = (noteId: string) => {
    window.dispatchEvent(new CustomEvent('navigate-to-notes', { detail: { noteId } }));
  };

  // Truncate text for preview
  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Remove markdown formatting for preview
  const stripMarkdown = (text: string) => {
    return text
      .replace(/[#*`_~]/g, '') // Remove markdown formatting
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Replace links with text
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .trim();
  };

  if (pinnedNotes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-100/50 to-orange-100/50 dark:from-yellow-900/20 dark:to-orange-900/20 backdrop-blur-md border border-white/20 dark:border-gray-600/20 flex items-center justify-center mb-4 shadow-lg">
          <Star className="w-8 h-8 text-yellow-500" />
        </div>
        <p className="text-white font-medium mb-2" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>{t('dashboard.pinned_notes_widget.no_notes_pinned')}</p>
        <p className="text-sm text-white/80" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>
          {t('dashboard.pinned_notes_widget.pin_important_notes')}
        </p>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="space-y-3 max-h-full overflow-y-auto">
        {pinnedNotes.map((note) => (
          <div
            key={note.id}
            className="group p-3 bg-white/30 dark:bg-gray-700/30 backdrop-blur-sm rounded-lg border border-white/30 dark:border-gray-600/30 hover:bg-white/50 dark:hover:bg-gray-700/50 hover:shadow-lg transition-all duration-200 cursor-pointer"
            onClick={() => handleNoteClick(note.id)}
          >
            {/* Note Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <h4 className="font-medium text-white truncate" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>
                  {note.title || t('dashboard.pinned_notes_widget.untitled_note')}
                </h4>
              </div>
              <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            </div>

            {/* Note Preview */}
            {note.content && (
              <p className="text-sm text-white/80 mb-3 line-clamp-3" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>
                {truncateText(stripMarkdown(note.content))}
              </p>
            )}

            {/* Note Tags */}
            {note.tags && note.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {note.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100/50 dark:bg-blue-900/30 backdrop-blur-sm border border-blue-200/30 dark:border-blue-700/20 text-blue-800 dark:text-blue-300 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
                {note.tags.length > 3 && (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100/50 dark:bg-gray-700/50 backdrop-blur-sm border border-white/20 dark:border-gray-600/20 text-white rounded-full">
                    +{note.tags.length - 3}
                  </span>
                )}
              </div>
            )}

            {/* Note Footer */}
            <div className="flex items-center justify-between text-xs text-white/70">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>{format(new Date(note.updatedAt), 'dd.MM.yyyy', { locale: de })}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Eye className="w-3 h-3" />
                  <span>{t('dashboard.pinned_notes_widget.click_to_edit')}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 