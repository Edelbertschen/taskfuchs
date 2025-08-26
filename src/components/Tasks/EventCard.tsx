import React from 'react';
import { Calendar, Clock, MapPin, ExternalLink, Eye, EyeOff, ChevronUp, ChevronDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import type { CalendarEvent } from '../../types/index';
import { useApp } from '../../context/AppContext';

interface EventCardProps {
  event: CalendarEvent;
  isDragging?: boolean;
  dragOverlay?: boolean;
  isVisible?: boolean;
  isCollapsed?: boolean;
  onToggleVisibility?: (eventId: string) => void;
  onToggleCollapse?: (eventId: string) => void;
}

export function EventCard({ 
  event, 
  isDragging = false, 
  dragOverlay = false, 
  isVisible = true,
  isCollapsed = false,
  onToggleVisibility,
  onToggleCollapse
}: EventCardProps) {
  const { state } = useApp();
  
  // Get calendar source for color
  const calendarSource = state.calendarSources.find(source => source.url === event.calendarUrl);
  const eventColor = calendarSource?.color || '#3b82f6';
  const accentColor = state.preferences.accentColor;
  
  // Format time display
  const formatEventTime = () => {
    if (event.allDay) {
      return 'Ganztägig';
    }
    
    const startTime = format(parseISO(event.startTime), 'HH:mm', { locale: de });
    const endTime = event.endTime ? format(parseISO(event.endTime), 'HH:mm', { locale: de }) : null;
    
    if (endTime && startTime !== endTime) {
      return `${startTime} - ${endTime}`;
    }
    
    return startTime;
  };

  // Calculate duration in minutes for time calculation
  const getEventDurationMinutes = () => {
    if (!event.endTime || event.allDay) return 30; // Default 30 minutes for all-day or no end time
    
    const start = parseISO(event.startTime);
    const end = parseISO(event.endTime);
    const durationMs = end.getTime() - start.getTime();
    return Math.max(0, durationMs / (1000 * 60)); // Duration in minutes
  };

  const durationMinutes = getEventDurationMinutes();

  // Collapsed view: very thin bar
  if (isCollapsed) {
    return (
      <div
        className={`group relative rounded border-l-4 shadow-sm transition-all duration-200 cursor-pointer ${
          isDragging ? 'opacity-50 scale-95' : 'hover:shadow-md'
        } ${dragOverlay ? 'rotate-2 shadow-xl' : ''} ${!isVisible ? 'opacity-60' : ''}`}
        style={{ 
          borderLeftColor: eventColor,
          height: '20px', // Very thin collapsed height
          backgroundColor: document.documentElement.classList.contains('dark') ? '#374151' : '#f3f4f6',
          borderColor: document.documentElement.classList.contains('dark') ? '#4b5563' : '#d1d5db'
        }}
        onClick={() => onToggleCollapse?.(event.id)}
        title={`${event.title} - ${formatEventTime()} ${event.location ? `(${event.location})` : ''}`}
      >
        <div className="flex items-center justify-between h-full px-2">
          <div className="flex items-center space-x-1 min-w-0 flex-1">
            <span className="text-xs text-gray-900 dark:text-white truncate font-semibold">
              {event.title}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-xs text-gray-700 dark:text-gray-200 font-medium">
              {formatEventTime()}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Expanded view: full card
  return (
    <div
      className={`group relative rounded-lg border-l-4 border shadow-sm transition-all duration-200 ${
        isDragging ? 'opacity-50 scale-95' : 'hover:shadow-md hover:scale-[1.02]'
      } ${dragOverlay ? 'rotate-2 shadow-xl' : ''} ${!isVisible ? 'opacity-60' : ''}`}
      style={{ 
        borderLeftColor: eventColor,
        minHeight: '60px', // Compact height
        backgroundColor: document.documentElement.classList.contains('dark') ? '#374151' : '#f3f4f6',
        borderColor: document.documentElement.classList.contains('dark') ? '#4b5563' : '#d1d5db'
      }}
    >
      {/* Compact Event Display */}
      <div className="p-2">
        <div className="flex items-center justify-between">
          {/* Left side: Event indicator and title */}
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <div className="flex items-center space-x-1 text-xs text-gray-700 dark:text-gray-200">
              <Calendar className="w-3 h-3" />
              <span>Termin</span>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
              {event.title}
            </h3>
          </div>
          
          {/* Right side: Time and actions */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 text-xs">
              <Clock className="w-3 h-3 text-gray-600 dark:text-gray-300" />
              <span className="text-gray-800 dark:text-gray-200 font-semibold">
                {formatEventTime()}
              </span>
            </div>
            
            {/* Toggle collapse button */}
            {onToggleCollapse && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleCollapse(event.id);
                }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title={isCollapsed ? "Termin ausklappen" : "Termin einklappen"}
              >
                {isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
              </button>
            )}

            {/* Toggle visibility button */}
            {onToggleVisibility && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleVisibility(event.id);
                }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title={isVisible ? "Termin ausblenden" : "Termin einblenden"}
              >
                {isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              </button>
            )}
            
            {/* External link */}
            {event.url && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(event.url, '_blank');
                }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title="Event öffnen"
              >
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
        
        {/* Optional second row for location and status */}
        {(event.location || event.status === 'tentative' || event.status === 'cancelled') && (
          <div className="flex items-center justify-between mt-1">
            {/* Location */}
            {event.location && (
              <div className="flex items-center space-x-1 text-xs text-gray-700 dark:text-gray-200">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate font-medium">{event.location}</span>
              </div>
            )}
            
            {/* Status indicators */}
            <div className="flex items-center space-x-1">
              {event.status === 'tentative' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                  Vorläufig
                </span>
              )}
              {event.status === 'cancelled' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                  Abgesagt
                </span>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Colored Left Border Enhancement */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg opacity-20"
        style={{ backgroundColor: eventColor }}
      />
    </div>
  );
}

// Utility function to calculate event duration in minutes (for time summation)
export const getEventDurationMinutes = (event: CalendarEvent): number => {
  if (!event.endTime || event.allDay) return 30; // Default 30 minutes for all-day or no end time
  
  const start = parseISO(event.startTime);
  const end = parseISO(event.endTime);
  const durationMs = end.getTime() - start.getTime();
  return Math.max(0, durationMs / (1000 * 60)); // Duration in minutes
};