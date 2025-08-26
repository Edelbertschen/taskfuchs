import React from 'react';
import { FileText, ExternalLink } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from 'react-i18next';

interface LinkedNotesIndicatorProps {
  taskId: string;
  onNoteClick?: (noteId: string) => void;
}

export function LinkedNotesIndicator({ taskId, onNoteClick }: LinkedNotesIndicatorProps) {
  const { state, dispatch } = useApp();
  const { t } = useTranslation();

  // Dynamic accent color styles
  const getAccentColorStyles = () => {
    const accentColor = state.preferences.accentColor;
    return {
      text: { color: accentColor },
      textHover: { color: accentColor + 'B3' }, // 70% opacity
    };
  };
  
  // Find notes linked to this task
  const linkedNotes = (Array.isArray(state.notes?.notes) ? state.notes.notes : []).filter(note => 
    note.linkedTasks && note.linkedTasks.includes(taskId)
  );

  if (linkedNotes.length === 0) {
    return null;
  }

  const handleNoteClick = (note: any) => {
    // Emit custom event to navigate to notes
    window.dispatchEvent(new CustomEvent('navigate-to-notes', { 
      detail: { noteId: note.id } 
    }));
    // Select the note and switch to editor
    dispatch({ type: 'SELECT_NOTE', payload: note });
    dispatch({ type: 'SET_NOTES_VIEW', payload: 'editor' });
    if (onNoteClick) {
      onNoteClick(note.id);
    }
  };

  return (
    <div className="flex items-center space-x-1 text-xs">
      <FileText className="w-3 h-3" style={getAccentColorStyles().text} />
      <span className="font-medium" style={getAccentColorStyles().text}>
        {linkedNotes.length === 1 ? t('notes_view.notes_count', { count: linkedNotes.length }) : t('notes_view.notes_count_plural', { count: linkedNotes.length })}
      </span>
      {linkedNotes.length === 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNoteClick(linkedNotes[0]);
          }}
          className="ml-1 transition-colors"
          style={getAccentColorStyles().text}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = getAccentColorStyles().textHover.color;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = getAccentColorStyles().text.color;
          }}
          title={`Zur Notiz: ${linkedNotes[0].title}`}
        >
          <ExternalLink className="w-3 h-3" />
        </button>
      )}
      {linkedNotes.length > 1 && (
        <div className="relative group">
          <button 
            className="ml-1 transition-colors"
            style={getAccentColorStyles().text}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = getAccentColorStyles().textHover.color;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = getAccentColorStyles().text.color;
            }}
          >
            <ExternalLink className="w-3 h-3" />
          </button>
          <div className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity z-[60]">
            <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('tasks.modal.linked_notes')}:
            </div>
            {linkedNotes.map(note => (
              <button
                key={note.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleNoteClick(note);
                }}
                className="w-full text-left p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-xs text-gray-900 dark:text-white truncate transition-colors"
                title={note.title}
              >
                {note.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 