import React from 'react';
import { Bell, CheckCircle, X } from 'lucide-react';

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  reminderDate?: string;
  reminderTime?: string;
}

interface ChecklistReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ChecklistItem;
  accentColor: string;
  onComplete: (itemId: string) => void;
}

export function ChecklistReminderModal({ 
  isOpen, 
  onClose, 
  item,
  accentColor,
  onComplete 
}: ChecklistReminderModalProps) {
  if (!isOpen) return null;

  const handleComplete = () => {
    onComplete(item.id);
  };

  const handleContinue = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 transition-opacity backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 transform transition-all">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: accentColor + '20' }}
            >
              <Bell className="w-5 h-5" style={{ color: accentColor }} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              📝 Checkliste Erinnerung
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-gray-700 dark:text-gray-300 mb-2">
            Es ist Zeit für Ihren Checklistenpunkt:
          </p>
          <div 
            className="p-4 rounded-lg border-l-4 bg-gray-50 dark:bg-gray-700/50"
            style={{ borderLeftColor: accentColor }}
          >
            <p className="font-medium text-gray-900 dark:text-white">
              "{item.text}"
            </p>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {item.reminderDate === new Date().toISOString().split('T')[0] ? 'Heute' : 
             new Date(item.reminderDate || '').toLocaleDateString('de-DE')} um {item.reminderTime} Uhr
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={handleContinue}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
          >
            Verstanden
          </button>
          <button
            onClick={handleComplete}
            className="flex items-center px-4 py-2 text-sm font-medium text-white rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
            style={{ backgroundColor: accentColor }}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Erledigt
          </button>
        </div>
      </div>
    </div>
  );
} 