import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';
import { useAppTranslation } from '../../utils/i18nHelpers';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  itemName?: string;
  warningText?: string;
  simple?: boolean; // For simple confirmations without typing the delete keyword
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
  warningText,
  simple = false
}: DeleteConfirmationModalProps) {
  const [confirmationText, setConfirmationText] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const { actions, forms, messages } = useAppTranslation();

  useEffect(() => {
    if (isOpen) {
      setConfirmationText('');
      setIsConfirmed(simple); // In simple mode, start as confirmed
    }
  }, [isOpen, simple]);

  useEffect(() => {
    if (simple) {
      setIsConfirmed(true);
    } else {
      setIsConfirmed(confirmationText === 'LÖSCHEN');
    }
  }, [confirmationText, simple]);

  const handleConfirm = () => {
    if (isConfirmed) {
      onConfirm();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isConfirmed) {
      handleConfirm();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
              style={{ zIndex: 1500 }}
      onClick={() => {
        onClose();
      }}
    >
             <div 
         className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-md"
         onClick={(e) => {
           e.stopPropagation();
         }}
       >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <p className="text-gray-700 dark:text-gray-300 mb-2">
              {message}
            </p>
            
            {itemName && (
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Element:</strong> {itemName}
                </p>
              </div>
            )}

            {warningText && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
                <p className="text-sm text-red-800 dark:text-red-300">
                  <strong>Warnung:</strong> {warningText}
                </p>
              </div>
            )}

            {!simple && (
              <>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium mb-2">
                    {messages.actionCannotBeUndone()}
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    {forms.enterDeleteToConfirm()}
                  </p>
                </div>

                <input
                  type="text"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={forms.placeholderDeleteConfirmation()}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-center font-mono text-lg ${
                    confirmationText === 'LÖSCHEN' 
                      ? 'border-green-300 focus:ring-green-500 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300' 
                      : confirmationText === '' 
                      ? 'border-gray-300 dark:border-gray-600 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                      : 'border-red-300 focus:ring-red-500 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'
                  }`}
                  autoFocus
                />
                
                {confirmationText && confirmationText !== 'LÖSCHEN' && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                    {forms.enterDeleteExactly()}
                  </p>
                )}
              </>
            )}

            {simple && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium">
                  {messages.actionCannotBeUndone()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {actions.cancel()}
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleConfirm();
            }}
            disabled={!isConfirmed}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isConfirmed
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }`}
            style={{ zIndex: 1510, position: 'relative' }}
          >
            {actions.delete()}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
} 