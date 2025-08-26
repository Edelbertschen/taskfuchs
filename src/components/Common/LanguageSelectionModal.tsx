import React from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';

interface LanguageSelectionModalProps {
  isOpen: boolean;
  onLanguageSelected: (language: 'de' | 'en') => void;
}

export function LanguageSelectionModal({ isOpen, onLanguageSelected }: LanguageSelectionModalProps) {
  const { dispatch } = useApp();

  if (!isOpen) return null;

  const handleLanguageSelect = (language: 'de' | 'en') => {
    // Update language preference
    dispatch({
      type: 'UPDATE_PREFERENCES',
      payload: { language }
    });
    
    // Call parent callback
    onLanguageSelected(language);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-md w-full shadow-2xl border border-gray-100 dark:border-gray-800">
        <h2 className="text-2xl font-light text-gray-900 dark:text-white mb-6 text-center">
          Sprache wählen
        </h2>
        
        <div className="space-y-4">
          <button
            onClick={() => handleLanguageSelect('de')}
            className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 flex items-center gap-3"
          >
            <span className="text-2xl">🇩🇪</span>
            <span className="text-lg font-medium text-gray-900 dark:text-white">Deutsch</span>
          </button>
          
          <button
            onClick={() => handleLanguageSelect('en')}
            className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 flex items-center gap-3"
          >
            <span className="text-2xl">🇺🇸</span>
            <span className="text-lg font-medium text-gray-900 dark:text-white">English</span>
          </button>
        </div>
      </div>
    </div>
  );
} 