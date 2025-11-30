import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Clock, Plus, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface TimerWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskTitle: string;
  taskId: string;
  timeExceeded: number; // in minutes
}

export function TimerWarningModal({ 
  isOpen, 
  onClose, 
  taskTitle, 
  taskId, 
  timeExceeded
}: TimerWarningModalProps) {
  const { state, dispatch } = useApp();
  const [additionalTime, setAdditionalTime] = useState<number>(15);

  if (!isOpen) return null;

  const handleAddTime = () => {
    const task = state.tasks.find(t => t.id === taskId);
    if (task) {
      const newEstimatedTime = (task.estimatedTime || 0) + additionalTime;
      dispatch({
        type: 'UPDATE_TASK',
        payload: {
          ...task,
          estimatedTime: newEstimatedTime
        }
      });
    }
    onClose();
  };

  const handleContinueWithoutAddingTime = () => {
    onClose();
  };

  const content = {
        title: 'Zeit erreicht',
        icon: <Clock className="w-6 h-6" style={{ color: state.preferences.accentColor }} />,
        description: `Die geschätzte Zeit für "${taskTitle}" ist erreicht.`,
        additionalInfo: timeExceeded > 0 ? `Überschreitung: ${Math.round(timeExceeded)} Minuten` : null,
      };

  return createPortal(
    <div className="fixed inset-0 z-[9990] flex items-center justify-center" style={{ isolation: 'isolate' }}>
      <div className="fixed inset-0 bg-black/40 transition-opacity backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 max-w-md w-full mx-4 transform transition-all duration-200 border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            {content.icon}
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {content.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-gray-700 dark:text-gray-300 mb-2">
            {content.description}
          </p>
          {content.additionalInfo && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {content.additionalInfo}
            </p>
          )}
        </div>

        {/* Add Time Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Zeit hinzufügen
            </label>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setAdditionalTime(Math.max(5, additionalTime - 5))}
                  className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  -
                </button>
                <span className="w-16 text-center font-mono text-lg text-gray-900 dark:text-white">
                  {additionalTime}m
                </span>
                <button
                  onClick={() => setAdditionalTime(additionalTime + 5)}
                  className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  +
                </button>
              </div>
              <div className="flex space-x-2">
                {[15, 30, 60].map((minutes) => (
                  <button
                    key={minutes}
                    onClick={() => setAdditionalTime(minutes)}
                    className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                      additionalTime === minutes
                        ? 'text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    style={additionalTime === minutes ? { backgroundColor: state.preferences.accentColor } : {}}
                  >
                    {minutes}m
                  </button>
                ))}
              </div>
            </div>
          </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={handleContinueWithoutAddingTime}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Ohne Zeit fortfahren
          </button>
            <button
              onClick={handleAddTime}
              className="flex items-center px-4 py-2 text-sm text-white rounded-lg transition-colors hover:opacity-90"
              style={{ backgroundColor: state.preferences.accentColor }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Zeit hinzufügen
            </button>
        </div>
      </div>
    </div>,
    document.body
  );
} 