import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, subDays, startOfDay, isSameDay, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isAfter, isBefore, isSameMonth } from 'date-fns';
import { de } from 'date-fns/locale';
import { useApp } from '../../context/AppContext';
import type { Column } from '../../types';

interface DatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (columnId: string) => void;
  availableColumns: Column[];
  title?: string;
  allowAnyDate?: boolean;
}

export function DatePickerModal({ 
  isOpen, 
  onClose, 
  onSelectDate, 
  availableColumns,
  title,
  allowAnyDate = false
}: DatePickerModalProps) {
  const { state } = useApp();
  const accentColor = state.preferences.accentColor || '#0ea5e9';
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  if (!isOpen) return null;

  const today = startOfDay(new Date());
  const threeYearsFromNow = addDays(today, 365 * 3); // 36 months
  const dateColumns = availableColumns.filter(col => col.type === 'date');

  // Generate calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd
  });

  const handleDateClick = (date: Date) => {
    // Check if date is within allowed range (today to three years from now)
    if (allowAnyDate && (isBefore(date, today) || isAfter(date, threeYearsFromNow))) {
      return; // Don't allow selection of dates outside the range
    }

    setSelectedDate(date);
    
    if (allowAnyDate) {
      // For any date selection, return the date string directly
      const dateString = format(date, 'yyyy-MM-dd');
      onSelectDate(`date-${dateString}`);
      onClose();
    } else {
      // Find matching column for this date
      const dateString = format(date, 'yyyy-MM-dd');
      const matchingColumn = dateColumns.find(col => col.date === dateString);
      
      if (matchingColumn) {
        onSelectDate(matchingColumn.id);
        onClose();
      }
    }
  };

  const handleQuickSelect = (columnId: string) => {
    onSelectDate(columnId);
    onClose();
  };

  const previousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  // Day navigation functions
  const handlePreviousDay = () => {
    if (selectedDate) {
      const newDate = subDays(selectedDate, 1);
      setSelectedDate(newDate);
      // If the new date is in a different month, navigate to that month
      if (!isSameMonth(newDate, currentMonth)) {
        setCurrentMonth(newDate);
      }
    } else {
      // If no date is selected, select today and go to previous day
      const newDate = subDays(today, 1);
      setSelectedDate(newDate);
      if (!isSameMonth(newDate, currentMonth)) {
        setCurrentMonth(newDate);
      }
    }
  };

  const handleNextDay = () => {
    if (selectedDate) {
      const newDate = addDays(selectedDate, 1);
      setSelectedDate(newDate);
      // If the new date is in a different month, navigate to that month
      if (!isSameMonth(newDate, currentMonth)) {
        setCurrentMonth(newDate);
      }
    } else {
      // If no date is selected, select today and go to next day
      const newDate = addDays(today, 1);
      setSelectedDate(newDate);
      if (!isSameMonth(newDate, currentMonth)) {
        setCurrentMonth(newDate);
      }
    }
  };

  const handleTodaySelect = () => {
    setSelectedDate(today);
    if (!isSameMonth(today, currentMonth)) {
      setCurrentMonth(today);
    }
  };

  const isDateAvailable = (date: Date) => {
    if (allowAnyDate) {
      // Allow any date from today to three years from now
      return !isBefore(date, today) && !isAfter(date, threeYearsFromNow);
    } else {
      // Original logic: only available column dates
      const dateString = format(date, 'yyyy-MM-dd');
      return dateColumns.some(col => col.date === dateString);
    }
  };

  const weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  const modalContent = (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 10000000 }}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-md" style={{ zIndex: 10000001 }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {/* Quick Select - Only show if not allowing any date */}
          {!allowAnyDate && dateColumns.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Schnellauswahl
              </h3>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {dateColumns.slice(0, 14).map((column) => {
                  const date = new Date(column.date!);
                  const isToday = isSameDay(date, today);
                  const dayName = format(date, 'EEEE', { locale: de });
                  const dateStr = format(date, 'dd.MM.', { locale: de });
                  
                  return (
                    <button
                      key={column.id}
                      onClick={() => handleQuickSelect(column.id)}
                      className={`p-3 rounded-lg text-left transition-all duration-200 hover:scale-105 ${
                        isToday 
                          ? 'text-white shadow-md' 
                          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      style={isToday ? { backgroundColor: accentColor } : {}}
                    >
                      <div className={`text-sm font-medium ${
                        isToday ? 'text-white' : 'text-gray-900 dark:text-white'
                      }`}>
                        {dayName}
                      </div>
                      <div className={`text-xs ${
                        isToday ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {dateStr}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Calendar */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={previousMonth}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
              
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {format(currentMonth, 'MMMM yyyy', { locale: de })}
              </h3>
              
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekdays.map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date, index) => {
                const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                const isToday = isSameDay(date, today);
                const isAvailable = isDateAvailable(date);
                const isSelected = selectedDate && isSameDay(date, selectedDate);

                return (
                  <button
                    key={index}
                    onClick={() => isAvailable ? handleDateClick(date) : undefined}
                    disabled={!isAvailable}
                    className={`
                      p-2 text-sm rounded transition-all duration-200
                      ${!isCurrentMonth 
                        ? 'text-gray-300 dark:text-gray-600' 
                        : isAvailable
                          ? isToday
                            ? 'text-white font-semibold'
                            : isSelected
                              ? 'font-medium'
                              : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                          : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                      }
                      ${isAvailable && isCurrentMonth ? 'hover:scale-110' : ''}
                    `}
                    style={
                      !isCurrentMonth || !isAvailable
                        ? {}
                        : isToday
                        ? { backgroundColor: accentColor }
                        : isSelected
                        ? { 
                            backgroundColor: `${accentColor}20`, 
                            color: accentColor 
                          }
                        : {}
                    }
                  >
                    {format(date, 'd')}
                  </button>
                );
              })}
            </div>

            {/* Day Navigation Controls */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handlePreviousDay}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Vorheriger Tag</span>
              </button>
              
              <button
                onClick={handleTodaySelect}
                className="px-3 py-2 text-sm font-medium rounded-lg transition-colors"
                style={{
                  color: accentColor,
                  backgroundColor: `${accentColor}10`
                }}
              >
                Heute
              </button>
              
              <button
                onClick={handleNextDay}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <span>Nächster Tag</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Selected Date Display */}
            {selectedDate && (
              <div className="mt-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Ausgewähltes Datum:
                </div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {format(selectedDate, 'EEEE, dd. MMMM yyyy', { locale: de })}
                </div>
              </div>
            )}
          </div>

          {/* Info */}
          <div 
            className="mt-4 p-3 rounded-lg"
            style={{ backgroundColor: `${accentColor}08` }}
          >
            <div className="flex items-start space-x-2">
              <Calendar 
                className="w-4 h-4 mt-0.5 flex-shrink-0" 
                style={{ color: accentColor }}
              />
              <div className="text-sm">
                <p 
                  className="font-medium"
                  style={{ color: `${accentColor}E6` }}
                >
                  {allowAnyDate ? "Beliebiges Datum wählen" : "Verfügbare Termine"}
                </p>
                <p 
                  className="text-xs mt-1"
                  style={{ color: `${accentColor}CC` }}
                >
                  {allowAnyDate 
                    ? "Wählen Sie ein beliebiges Datum für Ihre Aufgabe aus."
                    : `Wählen Sie einen Termin aus den nächsten ${dateColumns.length} Tagen aus oder navigieren Sie im Kalender zu einem beliebigen Datum.`
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
} 