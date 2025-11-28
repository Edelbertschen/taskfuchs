import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, CheckCircle, AlertCircle, Clock, HardDrive, FolderOpen, 
  Shield, RefreshCw, Trash2, Settings, Download, ChevronRight,
  AlertTriangle, Loader2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from 'react-i18next';
import { format, formatDistanceToNow } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { backupService, BackupStatus, BackupResult } from '../../utils/backupService';

interface BackupSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BackupSetupModal({ isOpen, onClose }: BackupSetupModalProps) {
  const { state, dispatch } = useApp();
  const { i18n, t } = useTranslation();
  const dateLocale = i18n.language === 'de' ? de : enUS;
  
  // Backup status state
  const [status, setStatus] = useState<BackupStatus>(() => 
    backupService.getStatus(state.preferences.backup?.lastSuccess)
  );
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [backupMessage, setBackupMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Update status when backup service changes
  useEffect(() => {
    const updateStatus = () => {
      setStatus(backupService.getStatus(state.preferences.backup?.lastSuccess));
    };
    
    const unsubscribe = backupService.subscribe(updateStatus);
    updateStatus();
    
    return unsubscribe;
  }, [state.preferences.backup?.lastSuccess]);

  // Handle directory selection
  const handleChooseDirectory = useCallback(async () => {
    const success = await backupService.pickDirectory();
    if (success) {
      // Enable auto-backup if not already enabled
      const prev = state.preferences.backup || { enabled: false, intervalMinutes: 60, notify: true };
      dispatch({ 
        type: 'UPDATE_PREFERENCES', 
        payload: { 
          backup: { 
            enabled: true, 
            intervalMinutes: prev.intervalMinutes || 60, 
            notify: prev.notify ?? true,
            lastSuccess: prev.lastSuccess
          } 
        } 
      });
      
      // Create initial backup automatically
      setTimeout(() => handleCreateBackup(), 300);
    }
  }, [state.preferences.backup, dispatch]);

  // Handle backup creation
  const handleCreateBackup = useCallback(async () => {
    setIsCreatingBackup(true);
    setBackupMessage(null);

    const data = {
      tasks: state.tasks,
      archivedTasks: (state as any).archivedTasks || [],
      columns: state.columns,
      tags: state.tags,
      boards: state.boards || [],
      preferences: state.preferences,
      viewState: (state as any).viewState || {},
      projectKanbanColumns: (state as any).viewState?.projectKanban?.columns || [],
      projectKanbanState: (state as any).viewState?.projectKanban || {},
      pinColumns: state.pinColumns || [],
      recurrence: (state as any).recurrence || {},
      events: (state as any).events || [],
      calendarSources: (state as any).calendarSources || [],
    };

    const result = await backupService.createBackup(data);

    if (result.success) {
      setBackupMessage({ 
        type: 'success', 
        text: i18n.language === 'de' 
          ? `Backup erfolgreich erstellt: ${result.filename}` 
          : `Backup created successfully: ${result.filename}`
      });
      
      // Update last backup time
      dispatch({ 
        type: 'UPDATE_PREFERENCES', 
        payload: { 
          backup: { 
            ...state.preferences.backup, 
            lastSuccess: result.timestamp 
          } 
        } 
      });
    } else {
      setBackupMessage({ 
        type: 'error', 
        text: (i18n.language === 'de' ? 'Fehler: ' : 'Error: ') + result.error
      });
    }

    setIsCreatingBackup(false);
  }, [state, dispatch, i18n.language]);

  // Handle clear configuration
  const handleClearConfig = useCallback(async () => {
    if (window.confirm(
      i18n.language === 'de' 
        ? 'Backup-Konfiguration wirklich löschen? Du musst den Ordner danach neu auswählen.' 
        : 'Really clear backup configuration? You will need to select the folder again.'
    )) {
      await backupService.clearConfiguration();
      dispatch({ 
        type: 'UPDATE_PREFERENCES', 
        payload: { 
          backup: { 
            enabled: false, 
            intervalMinutes: 60, 
            notify: true,
            lastSuccess: undefined
          } 
        } 
      });
    }
  }, [dispatch, i18n.language]);

  // Toggle auto-backup
  const handleToggleAutoBackup = useCallback((enabled: boolean) => {
    dispatch({ 
      type: 'UPDATE_PREFERENCES', 
      payload: { 
        backup: { 
          ...state.preferences.backup,
          enabled 
        } 
      } 
    });
  }, [state.preferences.backup, dispatch]);

  // Change interval
  const handleIntervalChange = useCallback((minutes: number) => {
    dispatch({ 
      type: 'UPDATE_PREFERENCES', 
      payload: { 
        backup: { 
          ...state.preferences.backup,
          intervalMinutes: Math.max(1, minutes)
        } 
      } 
    });
  }, [state.preferences.backup, dispatch]);

  if (!isOpen) return null;

  const lastBackup = state.preferences.backup?.lastSuccess;
  const autoBackupEnabled = state.preferences.backup?.enabled;
  const intervalMinutes = state.preferences.backup?.intervalMinutes || 60;

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[6px]" />
      <div
        className="relative w-full max-w-lg mx-4 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.35)] border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900" 
          style={{ background: `linear-gradient(135deg, ${state.preferences.accentColor}15, ${state.preferences.accentColor}05)` }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${state.preferences.accentColor}20` }}
            >
              <Shield className="w-5 h-5" style={{ color: state.preferences.accentColor }} />
            </div>
            <div>
              <h3 className="text-gray-900 dark:text-white font-semibold text-[17px] tracking-tight">
                {i18n.language === 'de' ? 'Datensicherung' : 'Backup'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {i18n.language === 'de' ? 'Schütze deine Daten' : 'Protect your data'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Language switch */}
            <div className="flex items-center gap-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-0.5">
              {['de','en'].map(lang => (
                <button
                  key={lang}
                  onClick={() => i18n.changeLanguage(lang)}
                  className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${
                    i18n.language === lang 
                      ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' 
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
            <button 
              onClick={onClose} 
              className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
            <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          
          {/* Browser Support Warning */}
          {!status.supportsFileSystemAPI && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    {i18n.language === 'de' 
                      ? 'Browser nicht unterstützt' 
                      : 'Browser not supported'}
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                    {i18n.language === 'de' 
                      ? 'Dein Browser unterstützt keine lokalen Backups. Bitte verwende Chrome, Edge oder einen anderen Chromium-basierten Browser.' 
                      : 'Your browser does not support local backups. Please use Chrome, Edge or another Chromium-based browser.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Main Status Card */}
          {status.supportsFileSystemAPI && (
            <div 
              className={`p-5 rounded-xl border-2 transition-all ${
                status.isConfigured 
                  ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20' 
                  : 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  status.isConfigured 
                    ? 'bg-green-500/20' 
                    : 'bg-amber-500/20'
                }`}>
                  {status.isConfigured ? (
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className={`font-semibold ${
                    status.isConfigured 
                      ? 'text-green-800 dark:text-green-200' 
                      : 'text-amber-800 dark:text-amber-200'
                  }`}>
                    {status.isConfigured 
                      ? (i18n.language === 'de' ? 'Backup konfiguriert' : 'Backup configured')
                      : (i18n.language === 'de' ? 'Backup nicht eingerichtet' : 'Backup not configured')
                    }
                  </h4>
                  
                  {status.isConfigured && status.directoryName && (
                    <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                        <FolderOpen className="w-4 h-4" />
                        <span>{i18n.language === 'de' ? 'Ausgewählter Ordner:' : 'Selected folder:'}</span>
                      </div>
                      <div className="font-mono text-sm font-medium text-gray-900 dark:text-white break-all">
                        {status.directoryName}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 italic">
                        {i18n.language === 'de' 
                          ? '⚠️ Der Browser zeigt aus Sicherheitsgründen nur den Ordnernamen an, nicht den vollständigen Pfad.'
                          : '⚠️ For security reasons, the browser only shows the folder name, not the full path.'
                        }
                      </p>
                    </div>
                  )}
                  
                  {lastBackup && (
                    <div className="flex items-center gap-2 mt-2 text-sm">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-600 dark:text-gray-400">
                        {i18n.language === 'de' ? 'Letztes Backup: ' : 'Last backup: '}
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatDistanceToNow(new Date(lastBackup), { addSuffix: true, locale: dateLocale })}
                        </span>
                      </span>
                    </div>
                  )}

                  {!status.isConfigured && (
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-2">
                      {i18n.language === 'de' 
                        ? 'Wähle einen Ordner, um automatische Backups zu aktivieren.' 
                        : 'Select a folder to enable automatic backups.'}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 mt-4">
                {status.isConfigured ? (
                  <>
                    <button
                      onClick={handleCreateBackup}
                      disabled={isCreatingBackup}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all hover:opacity-90 disabled:opacity-60"
                      style={{ backgroundColor: state.preferences.accentColor }}
                    >
                      {isCreatingBackup ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      {isCreatingBackup 
                        ? (i18n.language === 'de' ? 'Speichern...' : 'Saving...') 
                        : (i18n.language === 'de' ? 'Jetzt sichern' : 'Backup now')
                      }
                    </button>
                    <button
                      onClick={handleChooseDirectory}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium transition-all hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <FolderOpen className="w-4 h-4" />
                      {i18n.language === 'de' ? 'Ordner ändern' : 'Change folder'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleChooseDirectory}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-medium transition-all hover:opacity-90"
                    style={{ 
                      backgroundColor: state.preferences.accentColor,
                      boxShadow: `0 4px 14px -3px ${state.preferences.accentColor}50`
                    }}
                  >
                    <FolderOpen className="w-4 h-4" />
                    {i18n.language === 'de' ? 'Ordner wählen und loslegen' : 'Choose folder and get started'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Success/Error Message */}
          {backupMessage && (
            <div className={`p-3 rounded-lg flex items-center gap-2 ${
              backupMessage.type === 'success' 
                ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' 
                : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
            }`}>
              {backupMessage.type === 'success' ? (
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="text-sm">{backupMessage.text}</span>
            </div>
          )}

          {/* Auto-Backup Settings */}
          {status.isConfigured && (
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {i18n.language === 'de' ? 'Automatisches Backup' : 'Automatic backup'}
                  </span>
                </div>
                <button
                  onClick={() => handleToggleAutoBackup(!autoBackupEnabled)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    autoBackupEnabled 
                      ? '' 
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                  style={autoBackupEnabled ? { backgroundColor: state.preferences.accentColor } : {}}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                    autoBackupEnabled ? 'left-6' : 'left-1'
                  }`} />
                </button>
              </div>
              
              {autoBackupEnabled && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {i18n.language === 'de' ? 'Intervall:' : 'Interval:'}
                  </span>
                  <select
                    value={intervalMinutes}
                    onChange={(e) => handleIntervalChange(parseInt(e.target.value))}
                    className="px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    <option value={15}>{i18n.language === 'de' ? '15 Minuten' : '15 minutes'}</option>
                    <option value={30}>{i18n.language === 'de' ? '30 Minuten' : '30 minutes'}</option>
                    <option value={60}>{i18n.language === 'de' ? '1 Stunde' : '1 hour'}</option>
                    <option value={120}>{i18n.language === 'de' ? '2 Stunden' : '2 hours'}</option>
                    <option value={240}>{i18n.language === 'de' ? '4 Stunden' : '4 hours'}</option>
                  </select>
          </div>
              )}
            </div>
          )}

          {/* Fox Tip */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800">
            <img 
              src="/3d_fox.png" 
              alt="Fuchs" 
              className="w-14 h-14 object-contain flex-shrink-0"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (img.src.includes('/3d_fox.png')) img.src = './3d_fox.png';
              }}
            />
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <div className="font-semibold text-amber-800 dark:text-amber-200 mb-0.5">
                {i18n.language === 'de' ? 'Tipp vom Fuchs' : 'Fox tip'}
              </div>
              {i18n.language === 'de' 
                ? 'Sichere deine Daten regelmäßig – am besten am Ende jedes Arbeitstages mit dem Backup-Button in der Sidebar!'
                : 'Back up your data regularly – ideally at the end of each work day using the backup button in the sidebar!'
              }
            </div>
          </div>

          {/* Advanced Settings Toggle */}
          {status.isConfigured && (
            <>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center justify-between w-full py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  {i18n.language === 'de' ? 'Erweiterte Optionen' : 'Advanced options'}
                </span>
                <ChevronRight className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
              </button>

              {showAdvanced && (
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
                  <button
                    onClick={handleClearConfig}
                    className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    {i18n.language === 'de' ? 'Backup-Konfiguration löschen' : 'Clear backup configuration'}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Info */}
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            {i18n.language === 'de' 
              ? 'Backups können jederzeit über Einstellungen → Daten wiederhergestellt werden.'
              : 'Backups can be restored anytime via Settings → Data.'
            }
          </p>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex justify-end">
          <button
            onClick={onClose} 
            className="px-5 py-2 rounded-lg font-medium transition-colors"
            style={{ 
              backgroundColor: `${state.preferences.accentColor}15`,
              color: state.preferences.accentColor
            }}
          >
            {i18n.language === 'de' ? 'Fertig' : 'Done'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
