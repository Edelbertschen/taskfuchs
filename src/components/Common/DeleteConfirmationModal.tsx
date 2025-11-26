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
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-700"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {message}
          </p>
          
          {itemName && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg mb-4 border border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-medium text-gray-500 dark:text-gray-400">Element:</span> {itemName}
              </p>
            </div>
          )}

          {warningText && (
            <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg mb-4">
              <p className="text-sm text-red-700 dark:text-red-300">
                <span className="font-medium">Warnung:</span> {warningText}
              </p>
            </div>
          )}

          {!simple && (
            <>
              <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg p-4 mb-4">
                <p className="text-sm text-amber-800 dark:text-amber-300 font-medium mb-1">
                  {messages.actionCannotBeUndone()}
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  {forms.enterDeleteToConfirm()}
                </p>
              </div>

              <input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={forms.placeholderDeleteConfirmation()}
                className={`w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none focus:ring-0 text-center font-mono text-lg transition-colors ${
                  confirmationText === 'LÖSCHEN' 
                    ? 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300' 
                    : confirmationText === '' 
                    ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500'
                    : 'border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300'
                }`}
                autoFocus
              />
              
              {confirmationText && confirmationText !== 'LÖSCHEN' && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-2 text-center">
                  {forms.enterDeleteExactly()}
                </p>
              )}
            </>
          )}

          {simple && (
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg p-4">
              <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
                {messages.actionCannotBeUndone()}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
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
            className={`px-5 py-2 rounded-lg font-medium transition-all ${
              isConfirmed
                ? 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500 shadow-sm'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }`}
          >
            {actions.delete()}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
} 