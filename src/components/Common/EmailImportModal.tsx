import React, { useState, useRef } from 'react';
import { X, Mail, Upload, FileText, Loader, AlertCircle } from 'lucide-react';
import { EmailService, type ProcessedEmail } from '../../utils/emailService';
import { useApp } from '../../context/AppContext';

interface EmailImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (processedEmail: ProcessedEmail) => Promise<void>;
}

export function EmailImportModal({ isOpen, onClose, onImport }: EmailImportModalProps) {
  const { state } = useApp();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Dynamic accent color styles
  const getAccentColorStyles = () => {
    const accentColor = state.preferences.accentColor;
    return {
      text: { color: accentColor },
      bg: { backgroundColor: accentColor },
      bgHover: { backgroundColor: accentColor + 'E6' },
      bgLight: { backgroundColor: accentColor + '1A' },
      border: { borderColor: accentColor },
      ring: { '--tw-ring-color': accentColor },
    };
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
    setImportError(null);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set drag over to false if we're leaving the modal content area
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    try {
      setIsImporting(true);
      setImportError(null);
      
      const processedEmail = await EmailService.handleEmailDrop(e.dataTransfer);
      if (processedEmail) {
        await onImport(processedEmail);
        onClose();
      } else {
        setImportError('Keine gültige E-Mail-Datei gefunden. Bitte verwenden Sie .eml oder .msg Dateien.');
      }
    } catch (error) {
      console.error('Error handling email drop:', error);
      setImportError('Fehler beim Importieren der E-Mail. Bitte versuchen Sie es erneut.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      setImportError(null);
      
      // Die neue API gibt bereits ein ProcessedEmail zurück
      const processedEmail = await EmailService.parseEMLFile(file);
      await onImport(processedEmail);
      onClose();
    } catch (error) {
      console.error('Error importing EML file:', error);
      setImportError('Fehler beim Verarbeiten der EML-Datei. Bitte überprüfen Sie das Dateiformat.');
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md mx-4 overflow-hidden"
        onClick={handleModalClick}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg" style={getAccentColorStyles().bgLight}>
              <Mail className="w-5 h-5" style={getAccentColorStyles().text} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                📧 E-Mail importieren
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                EML/MSG-Dateien als Notiz hinzufügen
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".eml,.msg,message/rfc822"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
              isDragOver
                ? 'scale-105'
                : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100/50 dark:hover:bg-gray-700/50'
            }`}
            style={isDragOver ? {
              borderColor: getAccentColorStyles().border.borderColor,
              backgroundColor: getAccentColorStyles().bgLight.backgroundColor
            } : {}}
          >
            {isImporting ? (
              <div className="flex flex-col items-center">
                <div className="p-4 rounded-full mb-4" style={getAccentColorStyles().bgLight}>
                  <Loader className="w-8 h-8 animate-spin" style={getAccentColorStyles().text} />
                </div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  E-Mail wird verarbeitet...
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Bitte warten Sie einen Moment
                </p>
              </div>
            ) : (
              <>
                <div className="flex justify-center mb-4">
                  <div className={`p-4 rounded-full transition-colors`}
                    style={isDragOver 
                      ? getAccentColorStyles().bgLight
                      : { backgroundColor: getAccentColorStyles().bgLight.backgroundColor + '80' }
                    }>
                    <Mail className={`w-8 h-8 transition-colors`}
                      style={getAccentColorStyles().text} />
                  </div>
                </div>

                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {isDragOver ? '📧 E-Mail jetzt ablegen!' : 'E-Mail hier ablegen'}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Ziehen Sie EML/MSG-Dateien hier herein oder
                </p>

                <button
                  onClick={openFilePicker}
                  disabled={isImporting}
                  className="inline-flex items-center space-x-2 px-6 py-3 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={getAccentColorStyles().bg}
                  onMouseEnter={(e) => {
                    if (!isImporting) {
                      e.currentTarget.style.backgroundColor = getAccentColorStyles().bgHover.backgroundColor;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isImporting) {
                      e.currentTarget.style.backgroundColor = getAccentColorStyles().bg.backgroundColor;
                    }
                  }}
                >
                  <Upload className="w-4 h-4" />
                  <span>Datei auswählen</span>
                </button>
              </>
            )}
          </div>

          {/* Error Message */}
          {importError && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-sm font-medium text-red-800 dark:text-red-200">
                    Import-Fehler
                  </h5>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    {importError}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Info Section */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center">
              <FileText className="w-4 h-4 mr-2" />
              Unterstützte Formate
            </h5>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• <strong>.eml</strong> - Standard E-Mail-Format</li>
              <li>• <strong>.msg</strong> - Microsoft Outlook</li>
              <li>• <strong>Drag & Drop</strong> - Aus E-Mail-Clients</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              E-Mails werden als HTML-Notizen importiert
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 