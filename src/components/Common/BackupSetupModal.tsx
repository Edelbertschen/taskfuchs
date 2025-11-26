import React from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, AlertCircle, Clock, HardDrive, FolderOpen } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';

interface BackupSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChooseDirectory: () => Promise<void> | void;
}

export function BackupSetupModal({ isOpen, onClose, onChooseDirectory }: BackupSetupModalProps) {
  const { state, dispatch } = useApp();
  const { i18n, t } = useTranslation();
  const [dirName, setDirName] = React.useState<string | null>(null);
  const [isCreatingBackup, setIsCreatingBackup] = React.useState(false);
  const [backupMessage, setBackupMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const lastBackup = state.preferences.backup?.lastSuccess;
  const dateLocale = i18n.language === 'de' ? de : enUS;
  
  if (!isOpen) return null;

  React.useEffect(() => {
    try {
      const current: any = (window as any).__taskfuchs_backup_dir__;
      if (current?.name) setDirName(current.name);
    } catch {}
    const handler = (e: any) => {
      const name = e?.detail?.name;
      if (name) setDirName(name);
    };
    window.addEventListener('backup-dir-selected', handler as any);
    return () => window.removeEventListener('backup-dir-selected', handler as any);
  }, []);
  
  // Create backup now function
  const handleCreateBackupNow = async () => {
    setIsCreatingBackup(true);
    setBackupMessage(null);
    try {
      // Trigger the backup event
      window.dispatchEvent(new CustomEvent('create-backup-now'));
      // Wait a bit for the backup to complete
      await new Promise(resolve => setTimeout(resolve, 1500));
      setBackupMessage({ type: 'success', text: i18n.language === 'de' ? 'Backup erfolgreich erstellt!' : 'Backup created successfully!' });
      // Update last backup time
      dispatch({ 
        type: 'UPDATE_PREFERENCES', 
        payload: { 
          backup: { 
            ...state.preferences.backup, 
            lastSuccess: new Date().toISOString() 
          } 
        } 
      });
    } catch (e: any) {
      setBackupMessage({ type: 'error', text: (i18n.language === 'de' ? 'Backup fehlgeschlagen: ' : 'Backup failed: ') + (e?.message || 'Unknown error') });
    } finally {
      setIsCreatingBackup(false);
    }
  };
  
  // Handle directory selection and create initial backup
  const handleChooseDirectoryAndBackup = async () => {
    await onChooseDirectory();
    // After directory is selected, create initial backup
    setTimeout(() => {
      handleCreateBackupNow();
    }, 500);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[6px]" />
      <div
        className="relative w-full max-w-lg mx-4 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.35)] border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700" style={{ background: `${state.preferences.accentColor}12` }}>
          <div className="flex items-center gap-3">
            <h3 className="text-gray-900 dark:text-white font-semibold text-[17px] tracking-tight">{t('backup_modal.title', 'Backup einrichten')}</h3>
          </div>
          <div className="flex items-center gap-2">
            {/* Small language switch */}
            <div className="flex items-center gap-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-0.5">
              {['de','en'].map(lang => (
                <button
                  key={lang}
                  onClick={() => { try { i18n.changeLanguage(lang); } finally { /* force re-render */ try { (window as any).__force_backup_modal_rerender__?.(); } catch {} } }}
                  className={`px-2 py-0.5 rounded text-xs transition-colors ${i18n.language === lang ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-[15px] leading-relaxed text-gray-800 dark:text-gray-100 mb-5">
            {t('backup_modal.description', 'Um Datenverlust zu vermeiden, solltest du regelmäßig Backups als JSON-Datei erstellen. Klicke am Ende des Arbeitstages einfach auf den Backup-Button in der Sidebar.')}
          </p>
          
          {/* Last Backup Status */}
          <div className="mb-5 p-4 rounded-xl border" style={{ 
            backgroundColor: lastBackup ? `${state.preferences.accentColor}10` : 'rgb(254, 243, 199)',
            borderColor: lastBackup ? `${state.preferences.accentColor}30` : 'rgb(252, 211, 77)'
          }}>
            <div className="flex items-center gap-3">
              {lastBackup ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: state.preferences.accentColor }} />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
              )}
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {lastBackup 
                    ? (i18n.language === 'de' ? 'Letztes Backup' : 'Last Backup')
                    : (i18n.language === 'de' ? 'Noch kein Backup erstellt' : 'No backup created yet')
                  }
                </div>
                {lastBackup && (
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                    {format(new Date(lastBackup), i18n.language === 'de' ? "dd. MMMM yyyy 'um' HH:mm 'Uhr'" : "MMMM dd, yyyy 'at' h:mm a", { locale: dateLocale })}
                  </div>
                )}
              </div>
              {dirName && (
                <button
                  onClick={handleCreateBackupNow}
                  disabled={isCreatingBackup}
                  className="px-3 py-1.5 text-sm font-medium text-white rounded-lg transition-all hover:opacity-90 disabled:opacity-60"
                  style={{ backgroundColor: state.preferences.accentColor }}
                >
                  {isCreatingBackup 
                    ? (i18n.language === 'de' ? 'Speichern...' : 'Saving...') 
                    : (i18n.language === 'de' ? 'Jetzt sichern' : 'Backup now')
                  }
                </button>
              )}
            </div>
            {backupMessage && (
              <div className={`mt-2 text-sm flex items-center gap-2 ${backupMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {backupMessage.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {backupMessage.text}
              </div>
            )}
          </div>
          
          {/* Selected Directory */}
          {dirName && (
            <div className="mb-4 flex items-center gap-2 text-sm p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <FolderOpen className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-gray-600 dark:text-gray-300">{t('backup_modal.selected_dir', 'Ordner')}:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100 truncate flex-1" title={dirName}>{dirName}</span>
            </div>
          )}
          
          {!dirName && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-200">
              {i18n.language === 'de' 
                ? 'Bitte wähle zuerst einen Speicherort für deine Backups.'
                : 'Please choose a save location for your backups first.'
              }
            </div>
          )}
          
          <div className="text-xs text-gray-600 dark:text-gray-300 mb-5">
            {t('backup_modal.hint', 'Du kannst Backups jederzeit über Einstellungen → Daten wiederherstellen.')}
          </div>
          
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
            <img 
              src="/3d_fox.png" 
              alt="Fuchs" 
              className="w-12 h-12 object-contain flex-shrink-0"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (img.src.includes('/3d_fox.png')) img.src = './3d_fox.png';
              }}
            />
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <div className="font-medium text-gray-900 dark:text-white mb-0.5">{t('backup_modal.tip_title', 'Tipp des Fuchses')}</div>
              {i18n.language === 'de' 
                ? 'Klicke am Ende jedes Arbeitstages auf den Backup-Button – so bist du immer auf der sicheren Seite!'
                : 'Click the backup button at the end of each work day – that way you\'re always safe!'
              }
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-900">
          <button onClick={onClose} className="px-4 h-10 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
            {i18n.language === 'de' ? 'Schließen' : 'Close'}
          </button>
          <button
            onClick={handleChooseDirectoryAndBackup}
            className="px-4 h-10 rounded-lg text-white shadow-sm hover:opacity-95 flex items-center gap-2"
            style={{ backgroundColor: state.preferences.accentColor, boxShadow: `${state.preferences.accentColor}33 0 4px 16px` }}
          >
            <FolderOpen className="w-4 h-4" />
            {dirName 
              ? (i18n.language === 'de' ? 'Ordner ändern' : 'Change folder')
              : (i18n.language === 'de' ? 'Ordner wählen' : 'Choose folder')
            }
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}


