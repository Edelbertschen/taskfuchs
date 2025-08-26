import React, { useState } from 'react';
import { X, Clock } from 'lucide-react';

interface TaskTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (time: number) => void;
  currentTime?: number;
  taskTitle: string;
}

export function TaskTimeModal({ isOpen, onClose, onSave, currentTime = 0, taskTitle }: TaskTimeModalProps) {
  const [timeInput, setTimeInput] = useState(currentTime.toString());

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const timeValue = parseInt(timeInput);
    if (!isNaN(timeValue) && timeValue > 0) {
      onSave(timeValue);
      onClose();
    } else if (!isNaN(timeValue) && timeValue === 0) {
      // If 0 is entered, treat as removing the estimate
      onSave(undefined);
      onClose();
    }
  };

  const handleQuickTime = (minutes: number) => {
    setTimeInput(minutes.toString());
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 1000000 }} // Extremely high z-index
    >
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Zeitschätzung
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Für: <span className="font-medium">{taskTitle}</span>
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Zeit in Minuten
            </label>
            <input
              type="number"
              value={timeInput}
              onChange={(e) => setTimeInput(e.target.value)}
              placeholder="z.B. 30"
              min="0"
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-center text-lg"
              autoFocus
            />
            
            {/* Quick time buttons */}
            <div className="flex gap-2 mt-4 flex-wrap justify-center">
              {[15, 30, 45, 60, 90, 120].map(minutes => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => handleQuickTime(minutes)}
                  className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-all duration-200"
                >
                  {minutes}min
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors text-sm font-medium"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200"
            >
              Speichern
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 