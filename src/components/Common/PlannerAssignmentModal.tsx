import React, { useState } from 'react';
import { Calendar, X, CheckCircle, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, addDays, subDays, getDay, startOfWeek, endOfWeek } from 'date-fns';
import { de } from 'date-fns/locale';
import { useApp } from '../../context/AppContext';
import { Task } from '../../types';

interface PlannerAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onAssign: (date: string) => void;
}

export function PlannerAssignmentModal({ isOpen, onClose, task, onAssign }: PlannerAssignmentModalProps) {
  const { state } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  if (!isOpen || !task) return null;

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Start on Monday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleAssign = () => {
    if (selectedDate) {
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      onAssign(dateString);
      onClose();
    }
  };

  const handlePreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  // New day navigation functions
  const handlePreviousDay = () => {
    if (selectedDate) {
      const newDate = subDays(selectedDate, 1);
      setSelectedDate(newDate);
      // If the new date is in a different month, navigate to that month
      if (!isSameMonth(newDate, currentDate)) {
        setCurrentDate(newDate);
      }
    } else {
      // If no date is selected, select today and go to previous day
      const today = new Date();
      const newDate = subDays(today, 1);
      setSelectedDate(newDate);
      if (!isSameMonth(newDate, currentDate)) {
        setCurrentDate(newDate);
      }
    }
  };

  const handleNextDay = () => {
    if (selectedDate) {
      const newDate = addDays(selectedDate, 1);
      setSelectedDate(newDate);
      // If the new date is in a different month, navigate to that month
      if (!isSameMonth(newDate, currentDate)) {
        setCurrentDate(newDate);
      }
    } else {
      // If no date is selected, select today and go to next day
      const today = new Date();
      const newDate = addDays(today, 1);
      setSelectedDate(newDate);
      if (!isSameMonth(newDate, currentDate)) {
        setCurrentDate(newDate);
      }
    }
  };

  const handleTodaySelect = () => {
    const today = new Date();
    setSelectedDate(today);
    if (!isSameMonth(today, currentDate)) {
      setCurrentDate(today);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto modal-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${state.preferences.accentColor}20` }}
            >
              <CalendarDays 
                className="w-5 h-5"
                style={{ color: state.preferences.accentColor }}
              />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Aufgabe zuweisen
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Wähle einen Tag für die Aufgabe
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Task Info */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: state.preferences.accentColor }}
            />
            <span className="font-medium text-gray-900 dark:text-white">
              {task.title}
            </span>
          </div>
          {task.description && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {task.description}
            </p>
          )}
        </div>

        {/* Calendar */}
        <div className="p-6">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handlePreviousMonth}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {format(currentDate, 'MMMM yyyy', { locale: de })}
            </h3>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Week Days */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day) => (
              <div
                key={day}
                className="h-8 flex items-center justify-center text-xs font-medium text-gray-500 dark:text-gray-400"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isSelected = selectedDate && format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
              const isTodayDate = isToday(day);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => handleDateSelect(day)}
                  className={`
                    h-10 flex items-center justify-center text-sm rounded-lg calendar-day-hover
                    ${isCurrentMonth 
                      ? 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700' 
                      : 'text-gray-400 dark:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }
                    ${isSelected 
                      ? 'text-white font-semibold shadow-lg calendar-day-selected' 
                      : ''
                    }
                    ${isTodayDate && !isSelected 
                      ? 'bg-gray-100 dark:bg-gray-700 font-medium' 
                      : ''
                    }
                  `}
                  style={isSelected ? {
                    backgroundColor: state.preferences.accentColor,
                  } : {}}
                >
                  {format(day, 'd')}
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
                color: state.preferences.accentColor,
                backgroundColor: `${state.preferences.accentColor}10`
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

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleAssign}
            disabled={!selectedDate}
            className={`
              px-6 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2
              ${selectedDate
                ? 'text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              }
            `}
            style={selectedDate ? {
              backgroundColor: state.preferences.accentColor,
            } : {}}
          >
            <CheckCircle className="w-4 h-4" />
            <span>Zuweisen</span>
          </button>
        </div>
      </div>
    </div>
  );
} 