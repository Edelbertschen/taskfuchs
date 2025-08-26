import React from 'react';
import { Pin, Archive, Link, Calendar, Tag, FileText, Clock } from 'lucide-react';
import type { Note } from '../../types';
import { useApp } from '../../context/AppContext';
import { useAppTranslation } from '../../utils/i18nHelpers';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface NoteCardProps {
  note: Note;
  onClick: () => void;
  listView?: boolean;
}

export function NoteCard({ note, onClick, listView = false }: NoteCardProps) {
  const { state, dispatch } = useApp();
  const { noteCard } = useAppTranslation();
  const isMinimalDesign = state.preferences.minimalDesign;

  // Dynamic accent color styles
  const getAccentColorStyles = () => {
    const accentColor = state.preferences.accentColor || '#0ea5e9';
    return {
      text: { color: accentColor },
      border: { borderColor: accentColor + '80' }, // 50% opacity
      bgLight: { backgroundColor: accentColor + '1A' }, // 10% opacity
      inactive: { color: '#9CA3AF' }
    };
  };
  
  const handlePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (note.pinned) {
      dispatch({ type: 'UNPIN_NOTE', payload: note.id });
    } else {
      dispatch({ type: 'PIN_NOTE', payload: note.id });
    }
  };

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'ARCHIVE_NOTE', payload: note.id });
  };

  // Calculate reading time (approx 200 words per minute)
  const wordCount = note.content.split(/\s+/).filter(word => word.length > 0).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  // Get preview text (first 150 characters)
  const previewText = note.content.length > 150 
    ? note.content.substring(0, 150) + '...'
    : note.content;

  // Count linked items
  const linkedItemsCount = note.linkedTasks.length + note.linkedNotes.length;

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd.MM.yyyy HH:mm', { locale: de });
  };

  const cardClass = listView
            ? `rounded-lg p-4 hover:shadow-sm transition-all duration-200 cursor-pointer border ${
                isMinimalDesign
                  ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              }`
        : `rounded-xl p-4 hover:shadow-md transition-all duration-300 cursor-pointer border ${
                isMinimalDesign
                  ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              }`;

  if (listView) {
    return (
      <div 
        className={cardClass} 
        onClick={onClick}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = getAccentColorStyles().border.borderColor;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '';
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              {note.pinned && (
                <Pin className="w-4 h-4 fill-current" style={getAccentColorStyles().text} />
              )}
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {note.title}
              </h3>
              {note.archived && (
                <Archive className="w-4 h-4 text-gray-400" />
              )}
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
              {previewText}
            </p>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(note.updatedAt)}</span>
                </div>
                
                {wordCount > 0 && (
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{readingTime} Min.</span>
                  </div>
                )}
                
                {linkedItemsCount > 0 && (
                  <div className="flex items-center space-x-1">
                    <Link className="w-3 h-3" />
                    <span>{linkedItemsCount} Verknüpfung{linkedItemsCount === 1 ? '' : 'en'}</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                {note.tags.slice(0, 3).map(tag => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-1 rounded-full"
                    style={{
                      backgroundColor: getAccentColorStyles().bgLight.backgroundColor,
                      color: getAccentColorStyles().text.color
                    }}
                  >
                    {tag}
                  </span>
                ))}
                {note.tags.length > 3 && (
                  <span className="text-xs text-gray-400">
                    +{note.tags.length - 3}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-1 ml-4">
            <button
              onClick={handlePin}
              className="p-1 transition-colors"
              style={note.pinned ? getAccentColorStyles().text : getAccentColorStyles().inactive}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = getAccentColorStyles().text.color;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = note.pinned ? getAccentColorStyles().text.color : getAccentColorStyles().inactive.color;
              }}
              title={note.pinned ? 'Lösen' : 'Anheften'}
            >
              <Pin className={`w-4 h-4 ${note.pinned ? 'fill-current' : ''}`} />
            </button>
            
            {!note.archived && (
              <button
                onClick={handleArchive}
                className="p-1 text-gray-400 transition-colors"
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = getAccentColorStyles().text.color;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = getAccentColorStyles().inactive.color;
                }}
                title={noteCard.archive()}
              >
                <Archive className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cardClass} 
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = getAccentColorStyles().border.borderColor;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '';
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          {note.pinned && (
            <Pin className="w-4 h-4 fill-current" style={getAccentColorStyles().text} />
          )}
          <h3 className="font-semibold text-gray-900 dark:text-white text-lg line-clamp-2">
            {note.title}
          </h3>
        </div>
        
        <div className="flex items-center space-x-1">
          <button
            onClick={handlePin}
            className="p-1 transition-colors opacity-0 group-hover:opacity-100"
            style={note.pinned ? getAccentColorStyles().text : getAccentColorStyles().inactive}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = getAccentColorStyles().text.color;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = note.pinned ? getAccentColorStyles().text.color : getAccentColorStyles().inactive.color;
            }}
            title={note.pinned ? noteCard.unpin() : noteCard.pin()}
          >
            <Pin className={`w-4 h-4 ${note.pinned ? 'fill-current' : ''}`} />
          </button>
          
          {!note.archived && (
            <button
              onClick={handleArchive}
              className="p-1 text-gray-400 transition-colors opacity-0 group-hover:opacity-100"
              onMouseEnter={(e) => {
                e.currentTarget.style.color = getAccentColorStyles().text.color;
              }}
                              onMouseLeave={(e) => {
                  e.currentTarget.style.color = getAccentColorStyles().inactive.color;
                }}
                title={noteCard.archive()}
            >
              <Archive className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      
      {note.archived && (
        <div className="flex items-center space-x-2 mb-3" style={getAccentColorStyles().text}>
          <Archive className="w-4 h-4" />
          <span className="text-sm font-medium">{noteCard.archived()}</span>
        </div>
      )}
      
      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-4">
        {previewText}
      </p>
      
      {/* Tags */}
      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {note.tags.slice(0, 4).map(tag => (
            <span
              key={tag}
              className="text-xs px-2 py-1 rounded-full"
              style={{
                backgroundColor: getAccentColorStyles().bgLight.backgroundColor,
                color: getAccentColorStyles().text.color
              }}
            >
              {tag}
            </span>
          ))}
          {note.tags.length > 4 && (
            <span className="text-xs text-gray-400 px-2 py-1">
              +{note.tags.length - 4} weitere
            </span>
          )}
        </div>
      )}
      
      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <Calendar className="w-3 h-3" />
            <span>{formatDate(note.updatedAt)}</span>
          </div>
          
          {wordCount > 0 && (
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>{readingTime} Min.</span>
            </div>
          )}
        </div>
        
        {linkedItemsCount > 0 && (
          <div className="flex items-center space-x-1 text-accent">
            <Link className="w-3 h-3" />
            <span>{linkedItemsCount}</span>
          </div>
        )}
      </div>
    </div>
  );
} 