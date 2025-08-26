import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';
import { validateImportData } from '../../utils/importExport';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle,
  X,
  Download,
  Shield,
  Info
} from 'lucide-react';

interface NextcloudImportHelperProps {
  onClose?: () => void;
  onImportSuccess?: () => void;
}

export const NextcloudImportHelper: React.FC<NextcloudImportHelperProps> = ({ 
  onClose, 
  onImportSuccess 
}) => {
  const { t } = useTranslation();
  const { dispatch } = useApp();

  // ===== STATE =====
  
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [importStep, setImportStep] = useState<'select' | 'validate' | 'confirm' | 'importing' | 'success'>('select');
  const [importError, setImportError] = useState<string | null>(null);

  // ===== FILE HANDLING =====

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = (file: File) => {
    // Validate file type
    if (!file.name.endsWith('.json')) {
      setImportError('Bitte wählen Sie eine JSON-Datei aus');
      return;
    }

    // Validate file name pattern (optional)
    const isTaskFuchsFile = file.name.startsWith('TaskFuchs_') || 
                           file.name.includes('taskfuchs') || 
                           file.name.includes('TaskFuchs');
    
    setSelectedFile(file);
    setImportError(null);
    validateFile(file);
  };

  const validateFile = (file: File) => {
    setImportStep('validate');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);
        
        // Validate import data
        const validation = validateImportData(data);
        setValidationResult(validation);
        setImportStep('confirm');
        
      } catch (error) {
        setImportError('Datei ist kein gültiges JSON oder beschädigt');
        setImportStep('select');
      }
    };

    reader.onerror = () => {
      setImportError('Fehler beim Lesen der Datei');
      setImportStep('select');
    };

    reader.readAsText(file);
  };

  const performImport = () => {
    if (!selectedFile || !validationResult) return;

    setImportStep('importing');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);
        
                         // Import data into app - VOLLSTÄNDIGER IMPORT ALLER FEATURES
        dispatch({
          type: 'IMPORT_DATA_REPLACE',
          payload: {
            // Kern-Daten
            tasks: data.tasks || data.data?.tasks || [],
            boards: data.boards || data.kanbanBoards || data.data?.kanbanBoards || [],
            columns: data.columns || data.data?.columns || [],
            tags: data.tags || data.data?.tags || [],
            notes: Array.isArray(data.notes) 
              ? data.notes 
              : (data.notes && Array.isArray(data.notes.notes) 
                  ? data.notes.notes 
                  : (data.data?.notes || [])),
            noteLinks: data.noteLinks || data.data?.noteLinks || [],
            preferences: data.preferences || data.data?.preferences || {},
            viewState: data.viewState || data.data?.viewState || {},
            projectKanbanColumns: data.projectKanbanColumns || data.data?.projectKanbanColumns || [],
            projectKanbanState: data.projectKanbanState || data.data?.projectKanbanState || {},
            
            // 🎯 PIN SYSTEM - NEU!
            pinColumns: data.pinColumns || data.data?.pinColumns || [],
            
            // 📧 NOTES VIEW STATE mit E-Mail Modus
            notesViewState: data.notesViewState || data.data?.notesViewState || {},
            
            // 📅 KALENDER-DATEN
            events: data.events || data.data?.events || [],
            calendarSources: data.calendarSources || data.data?.calendarSources || [],
            
            // 🔍 FILTER UND ANSICHTEN
            searchQuery: data.searchQuery || data.data?.searchQuery || '',
            activeTagFilters: data.activeTagFilters || data.data?.activeTagFilters || [],
            activePriorityFilters: data.activePriorityFilters || data.data?.activePriorityFilters || [],
            focusMode: data.focusMode !== undefined ? data.focusMode : (data.data?.focusMode !== undefined ? data.data.focusMode : undefined),
            focusedColumnId: data.focusedColumnId !== undefined ? data.focusedColumnId : data.data?.focusedColumnId,
            showCompletedTasks: data.showCompletedTasks !== undefined ? data.showCompletedTasks : data.data?.showCompletedTasks,
            projectColumnOffset: data.projectColumnOffset !== undefined ? data.projectColumnOffset : data.data?.projectColumnOffset,
            
            // 🔔 BENACHRICHTIGUNGEN
            notifications: data.notifications || data.data?.notifications || [],
            
            // 📝 EDITOR STATUS
            isNoteEditorFullScreen: data.isNoteEditorFullScreen !== undefined ? data.isNoteEditorFullScreen : data.data?.isNoteEditorFullScreen,
            
            // 🔄 WIEDERHOLUNGSREGELN
            recurrence: data.recurrence || data.data?.recurrence || {},
            
            // 🖼️ BILDSPEICHER
            imageStorage: data.imageStorage || data.data?.imageStorage || { images: [], currentSize: 0 },
            
            // 🕒 ZEITBUDGET-FEATURES (Version 2.3+)
            personalCapacity: data.personalCapacity || data.data?.personalCapacity || null,
            projectTimebudgets: data.projectTimebudgets || data.data?.projectTimebudgets || null
          } as any
        });

        // Set additional data if available
        if (data.imageStorage) {
          dispatch({ type: 'SET_IMAGE_STORAGE', payload: data.imageStorage });
        }

        if (data.notifications) {
          data.notifications.forEach((notification: any) => {
            dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
          });
        }

        setImportStep('success');
        
        // Auto-close after success
        setTimeout(() => {
          onImportSuccess?.();
          onClose?.();
        }, 2000);

      } catch (error) {
        setImportError('Fehler beim Importieren der Daten');
        setImportStep('select');
      }
    };

    reader.readAsText(selectedFile);
  };

  const resetImport = () => {
    setSelectedFile(null);
    setValidationResult(null);
    setImportStep('select');
    setImportError(null);
  };

  // ===== HELPER METHODS =====

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isTaskFuchsFile = (filename: string): boolean => {
    return filename.startsWith('TaskFuchs_') || 
           filename.toLowerCase().includes('taskfuchs');
  };

  // ===== RENDER =====

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                     <div className="flex items-center space-x-3">
             <Download className="w-6 h-6 text-blue-500" />
             <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
               Nextcloud-Datei importieren
             </h2>
           </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          
          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-100">
                  Nextcloud-Dateien importieren
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Laden Sie JSON-Dateien hoch, die Sie aus Ihrer Nextcloud heruntergeladen haben. 
                  Diese Dateien haben normalerweise das Format <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">TaskFuchs_YYYY-MM-DD_HH-mm-ss_auto.json</code>
                </p>
              </div>
            </div>
          </div>

          {/* File Selection */}
          {importStep === 'select' && (
            <div className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <Upload className="w-12 h-12 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-900 dark:text-white">
                      JSON-Datei auswählen
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Ziehen Sie eine Datei hierher oder klicken Sie zum Auswählen
                    </p>
                  </div>
                  <div>
                    <label className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer transition-colors">
                      <FileText className="w-4 h-4 mr-2" />
                      Datei auswählen
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleFileInput}
                        className="sr-only"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {importError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <p className="text-sm text-red-700 dark:text-red-300">{importError}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Validation */}
          {importStep === 'validate' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Datei wird validiert...</p>
            </div>
          )}

          {/* Confirmation */}
          {importStep === 'confirm' && validationResult && selectedFile && (
            <div className="space-y-6">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Datei erfolgreich validiert!
                  </p>
                </div>
              </div>

              {/* File Info */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">Datei-Informationen</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Dateiname:</span>
                    <p className="font-mono text-gray-900 dark:text-white break-all">{selectedFile.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Größe:</span>
                    <p className="text-gray-900 dark:text-white">{formatFileSize(selectedFile.size)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Version:</span>
                    <p className="text-gray-900 dark:text-white">{validationResult.version}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Typ:</span>
                    <p className="text-gray-900 dark:text-white">
                      {isTaskFuchsFile(selectedFile.name) ? 'TaskFuchs Backup' : 'JSON-Datei'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Data Summary */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">Daten-Übersicht</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {validationResult.summary.tasks}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">Aufgaben</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {validationResult.summary.notes}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">Notizen</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {validationResult.summary.tags}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">Tags</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {validationResult.summary.boards}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">Boards</p>
                  </div>
                </div>
              </div>

              {/* Warnings */}
              {validationResult.warnings.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Warnungen:</p>
                      <ul className="text-sm text-yellow-700 dark:text-yellow-300 mt-1 space-y-1">
                        {validationResult.warnings.map((warning: string, index: number) => (
                          <li key={index}>• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Warning */}
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">
                      Warnung: Alle aktuellen Daten werden überschrieben!
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      Diese Aktion kann nicht rückgängig gemacht werden. Stellen Sie sicher, 
                      dass Sie ein aktuelles Backup haben.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-3">
                <button
                  onClick={resetImport}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={performImport}
                  className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
                >
                  Daten importieren
                </button>
              </div>
            </div>
          )}

          {/* Importing */}
          {importStep === 'importing' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Daten werden importiert...</p>
            </div>
          )}

          {/* Success */}
          {importStep === 'success' && (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Import erfolgreich!
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Ihre Daten wurden erfolgreich importiert.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NextcloudImportHelper; 