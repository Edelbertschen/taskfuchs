import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Clock, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { format, addDays, startOfDay, isSameDay, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isAfter, isBefore } from 'date-fns';
import { de } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import type { Column } from '../../types';

interface DatePickerSliderProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (columnId: string) => void;
  availableColumns: Column[];
  title?: string;
  allowAnyDate?: boolean;
  accentColor: string;
}

export function DatePickerSlider({ 
  isOpen, 
  onClose, 
  onSelectDate, 
  availableColumns,
  title,
  allowAnyDate = false,
  accentColor
}: DatePickerSliderProps) {
  const { t } = useTranslation();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [leftPosition, setLeftPosition] = useState(80); // Default: right of main sidebar

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sliderRef.current && !sliderRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Calculate position based on visible sidebars
  useEffect(() => {
    if (isOpen) {
      // Simple check: look for visible secondary sidebar with specific selectors
      const taskSidebar = document.querySelector('.w-80[style*="translateX(0)"]');
      const projectSidebar = document.querySelector('.w-80:not([style*="translateX(-100%)"])');
      
      // Check if any w-80 sidebar is actually visible on screen
      let hasVisibleSecondarySidebar = false;
      const sidebars = document.querySelectorAll('.w-80');
      
      sidebars.forEach(sidebar => {
        const rect = sidebar.getBoundingClientRect();
        // If sidebar has width and is positioned within viewport
        if (rect.width > 0 && rect.left >= 0 && rect.left < 500) {
          hasVisibleSecondarySidebar = true;
        }
      });
      
      console.log('Visible secondary sidebar detected:', hasVisibleSecondarySidebar);
      
      if (hasVisibleSecondarySidebar) {
        // Main sidebar (80px) + Secondary sidebar (320px) = 400px
        setLeftPosition(400);
      } else {
        // Only main sidebar (80px)
        setLeftPosition(80);
      }
    }
  }, [isOpen]);

  const today = startOfDay(new Date());
  const threeYearsFromNow = addDays(today, 365 * 3);
  const dateColumns = availableColumns.filter(col => col.type === 'date');

  // Generate calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd
  });

  const handleDateClick = (date: Date) => {
    if (allowAnyDate && (isBefore(date, today) || isAfter(date, threeYearsFromNow))) {
      return;
    }

    setSelectedDate(date);
    
    // Find existing column for this date or create new one
    const dateString = format(date, 'yyyy-MM-dd');
    const existingColumn = dateColumns.find(col => col.date === dateString);
    
    if (existingColumn) {
      onSelectDate(existingColumn.id);
    } else {
      // This will trigger creation of a new date column
      onSelectDate(`date-${dateString}`);
    }
    
    onClose();
  };

  const getDateColumnForDate = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return dateColumns.find(col => col.date === dateString);
  };

  const isDateDisabled = (date: Date) => {
    if (allowAnyDate) {
      return isBefore(date, today) || isAfter(date, threeYearsFromNow);
    }
    return false;
  };

  const getDayClasses = (date: Date) => {
    const baseClasses = "w-10 h-10 flex items-center justify-center text-sm rounded-lg transition-all duration-200";
    const isToday = isSameDay(date, today);
    const isSelected = selectedDate && isSameDay(date, selectedDate);
    const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
    const isDisabled = isDateDisabled(date);
    const hasColumn = getDateColumnForDate(date);

    if (isDisabled) {
      return `${baseClasses} text-gray-300 dark:text-gray-600 cursor-not-allowed`;
    }

    if (isSelected) {
      return `${baseClasses} text-white font-semibold shadow-lg scale-110`;
    }

    if (isToday) {
      return `${baseClasses} text-white font-semibold shadow-lg`;
    }

    if (hasColumn) {
      return `${baseClasses} text-gray-700 dark:text-gray-300 font-medium hover:scale-105 cursor-pointer bg-gray-50 dark:bg-gray-700`;
    }

    if (!isCurrentMonth) {
      return `${baseClasses} text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer`;
    }

    return `${baseClasses} text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105 cursor-pointer`;
  };

  const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  if (!isOpen) return null;

  return createPortal(
    <div
      className={`fixed transition-all duration-300 ease-out ${
        isOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}
      style={{ 
        top: '70px', // Positioned just below the header
        left: `${leftPosition}px`, // Position right next to the visible sidebars
        zIndex: 15 // Below sidebars but above content (secondary sidebar: z-20)
      }}
    >
      <div
        ref={sliderRef}
        className="w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700"
        style={{
          backdropFilter: 'blur(20px)',
          background: document.documentElement.classList.contains('dark') 
            ? 'rgba(31, 41, 55, 0.98)' 
            : 'rgba(255, 255, 255, 0.98)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0, 0, 0, 0.05)'
        }}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CalendarDays className="w-5 h-5" style={{ color: accentColor }} />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {title || 'Datum auswählen'}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Calendar */}
        <div className="p-4">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              {format(currentMonth, 'MMMM yyyy', { locale: de })}
            </h4>
            
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Week Days */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 h-8 flex items-center justify-center">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date, index) => {
              const hasColumn = getDateColumnForDate(date);
              return (
                <button
                  key={index}
                  onClick={() => handleDateClick(date)}
                  disabled={isDateDisabled(date)}
                  className={getDayClasses(date)}
                  style={
                    selectedDate && isSameDay(date, selectedDate)
                      ? { backgroundColor: accentColor }
                      : isSameDay(date, today)
                      ? { backgroundColor: `${accentColor}40` } // Accent color with 25% opacity
                      : {}
                  }
                  title={hasColumn ? `Bereits geplant: ${hasColumn.title}` : undefined}
                >
                  {format(date, 'd')}
                </button>
              );
            })}
          </div>


        </div>
      </div>
    </div>,
    document.body
  );
} 