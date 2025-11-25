import React from 'react';
import { Calendar, Plus, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface DailyNoteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  date: string;
  formattedDate: string;
}

export function DailyNoteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  date,
  formattedDate
}: DailyNoteConfirmationModalProps) {
  const { state } = useApp();
  const isMinimalDesign = state.preferences.minimalDesign;
  
  if (!isOpen) return null;

  const getAccentColorStyles = () => {
    const accentColor = state.preferences.accentColor;
    return {
      text: { color: accentColor },
      bg: { backgroundColor: accentColor },
      bgHover: { backgroundColor: accentColor + 'E6' }, // 90% opacity
      border: { borderColor: accentColor },
      bgLight: { backgroundColor: accentColor + '1A' }, // 10% opacity
    };
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className={`rounded-lg shadow-lg max-w-md w-full ${
                isMinimalDesign
                  ? 'bg-white dark:bg-gray-800'
                  : 'bg-white dark:bg-gray-800'
              }`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" style={getAccentColorStyles().text} />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Daily Note erstellen
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-6">
            <p className="text-gray-600 dark:text-gray-300 mb-2">
              Für <span className="font-semibold" style={getAccentColorStyles().text}>
                {formattedDate}
              </span> existiert noch keine Daily Note.
            </p>
            <p className="text-gray-600 dark:text-gray-300">
              Möchten Sie eine neue Daily Note für diesen Tag erstellen?
            </p>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 text-white rounded-md transition-colors flex items-center justify-center space-x-2"
              style={getAccentColorStyles().bg}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = getAccentColorStyles().bgHover.backgroundColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = getAccentColorStyles().bg.backgroundColor;
              }}
            >
              <Plus className="w-4 h-4" />
              <span>Erstellen</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 