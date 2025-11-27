import React, { useState, useMemo, useEffect } from 'react';
import { X, Archive, ArrowRight, Clock, CheckCircle, AlertCircle, Cloud, Upload, Wifi, WifiOff, HardDrive, FolderOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';
import { syncManager, SyncLogEntry, SyncStats } from '../../utils/syncUtils';
import type { Task, SyncStatus } from '../../types';
import { format, nextMonday, addDays, isFriday } from 'date-fns';
import { de } from 'date-fns/locale';

interface EndOfDayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Skill system icons and data - function to support i18n
const getSkillLevels = (language: string) => ({
  sloth: {
    name: language === 'en' ? 'Sloth' : 'Faultier',
    icon: '🦥',
    color: 'text-gray-500',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    description: language === 'en' ? 'Worked less than 50% of planned time with timer' : 'Weniger als 50% der geplanten Zeit mit Timer gearbeitet'
  },
  panda: {
    name: language === 'en' ? 'Panda' : 'Panda',
    icon: '🐼',
    color: 'text-orange-500',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    description: language === 'en' ? 'Worked 50-80% of planned time with timer' : '50-80% der geplanten Zeit mit Timer gearbeitet'
  },
  fox: {
    name: language === 'en' ? 'Fox' : 'Fuchs',
    icon: '🦊',
    color: 'text-red-500',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    description: language === 'en' ? 'Worked more than 80% of planned time with timer' : 'Mehr als 80% der geplanten Zeit mit Timer gearbeitet'
  }
});

export function EndOfDayModal({ isOpen, onClose }: EndOfDayModalProps) {
  const { state, dispatch } = useApp();
  const { i18n } = useTranslation();
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showMoveConfirm, setShowMoveConfirm] = useState(false);
  const canDropbox = state.preferences.dropbox?.enabled;
  const [eodUploading, setEodUploading] = useState(false);
  const [eodUploadMsg, setEodUploadMsg] = useState('');
  
  // Local backup state
  const [localBackupSaving, setLocalBackupSaving] = useState(false);
  const [localBackupMsg, setLocalBackupMsg] = useState('');
  const hasBackupDir = !!(window as any).__taskfuchs_backup_dir__;
  
  // Sync-related state
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isActive: false,
    lastSync: '',
    status: 'idle'
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);

  // Get today's tasks
  const todaysTasks = useMemo(() => {
    const today = new Date();
    const todayString = format(today, 'yyyy-MM-dd');
    
    return state.tasks.filter(task => {
      const isInTodayColumn = task.columnId === `date-${todayString}`;
      // Exclude already archived tasks so that the "Erledigte Aufgaben" section disappears after archiving
      const isNotArchived = !task.archived;
      return isInTodayColumn && isNotArchived;
    });
  }, [state.tasks]);

  // Calculate statistics
  const completedTasks = todaysTasks.filter(task => task.completed);
  const incompleteTasks = todaysTasks.filter(task => !task.completed);
  const totalEstimatedTime = todaysTasks.reduce((sum, task) => sum + (task.estimatedTime || 0), 0);
  const totalWorkedTime = todaysTasks.reduce((sum, task) => sum + (task.trackedTime || 0), 0); // Use tracked timer time from ALL tasks
  
  // Calculate work percentage for skill system
  const workPercentage = totalEstimatedTime > 0 ? (totalWorkedTime / totalEstimatedTime) * 100 : 0;
  
  // Determine skill level
  const getSkillLevel = () => {
    const skillLevels = getSkillLevels(i18n.language);
    if (workPercentage < 50) return skillLevels.sloth;
    if (workPercentage < 80) return skillLevels.panda;
    return skillLevels.fox;
  };
  
  const skillLevel = getSkillLevel();

  // Listen for close event from onboarding
  useEffect(() => {
    const handleCloseEndOfDayModal = () => {
      onClose();
    };
    
    window.addEventListener('close-end-of-day-modal', handleCloseEndOfDayModal);
    return () => window.removeEventListener('close-end-of-day-modal', handleCloseEndOfDayModal);
  }, [onClose]);
  
  // Initialize sync status monitoring
  useEffect(() => {
    if (!isOpen) return;
    
    // Temporarily disabled sync monitoring to fix white screen issue
    // TODO: Fix sync integration after Microsoft To Do integration
    /*
    const updateSyncStatus = (status: SyncStatus) => {
      setSyncStatus(status);
    };
    
    syncManager.onStatusUpdate(updateSyncStatus);
    
    // Initial status check
    const isConfigured = syncManager.isConfigured();
    const lastSync = syncManager.getLastSyncTime();
    
    setSyncStatus({
      isActive: syncManager.isSyncInProgress(),
      connected: true,
      lastSync: lastSync || '',
      status: syncManager.isSyncInProgress() ? 'syncing' : 'idle'
    });
    
    return () => {
      syncManager.offStatusUpdate(updateSyncStatus);
    };
    */
  }, [isOpen]);

  // Handle ESC key press
  useEffect(() => {
    if (!isOpen) return;

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  // Manual sync function
  const handleManualSync = async () => {
    if (isSyncing || !syncManager.isConfigured()) return;
    
    setIsSyncing(true);
    setSyncResult(null);
    
    try {
      const result = await syncManager.syncData({
        tasks: state.tasks,
        columns: state.columns,
        notes: state.notes.notes,
        preferences: state.preferences
      });
      setSyncResult({
        success: result.success,
        message: result.success 
          ? `Erfolgreich synchronisiert!`
          : 'Synchronisation fehlgeschlagen. Überprüfen Sie Ihre Internetverbindung.'
      });
    } catch (error) {
      setSyncResult({
        success: false,
        message: 'Synchronisation fehlgeschlagen: ' + (error instanceof Error ? error.message : 'Unbekannter Fehler')
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Get accent color styles
  const getAccentColorStyles = () => {
    const accentColor = state.preferences.accentColor;
    return {
      bg: { backgroundColor: accentColor },
      text: { color: accentColor },
      bgLight: { backgroundColor: accentColor + '15' },
      bgMedium: { backgroundColor: accentColor + '25' },
      border: { borderColor: accentColor + '30' },
    };
  };

  const handleArchiveCompleted = () => {
    completedTasks.forEach(task => {
      dispatch({
        type: 'UPDATE_TASK',
        payload: {
          ...task,
          archived: true,
          updatedAt: new Date().toISOString()
        }
      });
    });
    setShowArchiveConfirm(false);
  };

  // Check if today is Friday
  const todayIsFriday = isFriday(new Date());
  
  // Calculate target date: next Monday on Friday, otherwise tomorrow
  const getTargetDate = () => {
    const today = new Date();
    if (todayIsFriday) {
      return nextMonday(today);
    }
    return addDays(today, 1);
  };

  const handleMoveIncomplete = () => {
    const target = getTargetDate();
    const targetStr = format(target, 'yyyy-MM-dd');

    // Ensure the date column exists before moving
    dispatch({ type: 'ENSURE_DATE_COLUMN', payload: targetStr });

    incompleteTasks.forEach(task => {
      dispatch({
        type: 'MOVE_TASK',
        payload: {
          taskId: task.id,
          columnId: `date-${targetStr}`,
        }
      });
    });
    setShowMoveConfirm(false);
  };

  const handleDropboxUpload = async () => {
    if (!canDropbox || eodUploading) return;
    if (!confirm(i18n.language === 'en' ? 'Upload backup to Dropbox now?' : 'Jetzt Sicherung zu Dropbox hochladen?')) return;
    setEodUploading(true);
    setEodUploadMsg('');
    try {
      const { dropboxUpload } = await import('../../utils/dropboxSync');
      await dropboxUpload(state as any, dispatch as any);
      setEodUploadMsg(i18n.language === 'en' ? 'Uploaded successfully.' : 'Upload erfolgreich.');
    } catch (e: any) {
      setEodUploadMsg((i18n.language === 'en' ? 'Upload failed: ' : 'Upload fehlgeschlagen: ') + (e?.message || ''));
    } finally {
      setEodUploading(false);
    }
  };
  
  // Handle local backup
  const handleLocalBackup = async () => {
    if (localBackupSaving) return;
    
    // If no backup directory is set, open the backup setup modal
    if (!hasBackupDir) {
      window.dispatchEvent(new CustomEvent('open-backup-setup'));
      return;
    }
    
    setLocalBackupSaving(true);
    setLocalBackupMsg('');
    try {
      // Trigger backup creation
      window.dispatchEvent(new CustomEvent('create-backup-now'));
      await new Promise(resolve => setTimeout(resolve, 1500));
      
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
      
      setLocalBackupMsg(i18n.language === 'en' ? 'Backup saved successfully!' : 'Backup erfolgreich gespeichert!');
    } catch (e: any) {
      setLocalBackupMsg((i18n.language === 'en' ? 'Backup failed: ' : 'Backup fehlgeschlagen: ') + (e?.message || ''));
    } finally {
      setLocalBackupSaving(false);
    }
  };

  const isConfigured = (() => {
    try {
      return syncManager.isConfigured();
    } catch (error) {
      console.error('Error checking sync configuration:', error);
      return false;
    }
  })();

  if (!isOpen) return null;

  // Check if onboarding is active (check for onboarding modal in DOM)
  const isOnboardingActive = typeof document !== 'undefined' && 
    document.querySelector('[data-onboarding-modal="true"]') !== null;

  return (
    <div 
      className={`fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300 ${
        isOnboardingActive ? 'z-[999990]' : 'z-50'
      }`}
      onMouseDown={(e) => {
        // Do not close while dragging tasks or archiving
        const dragging = (window as any).__taskfuchs_isDraggingTasks;
        const archiving = (window as any).__taskfuchs_isArchiving;
        if (dragging || archiving) return;
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-4 duration-500"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900"></div>
          <div className="relative p-8 border-b border-gray-200/50 dark:border-gray-700/50">
            <div className="absolute top-6 right-6">
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all rounded-xl hover:bg-white/50 dark:hover:bg-gray-800/50"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="text-center">
              {/* All Three Animals with Active Highlighting */}
              <div className="flex justify-center items-center mb-6 space-x-4">
                {/* Sloth */}
                <div className={`flex flex-col items-center transition-all duration-300 ${
                  skillLevel.name === 'Faultier' ? 'scale-110' : 'scale-90 opacity-60'
                }`}>
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl border-4 transition-all duration-300 ${
                    skillLevel.name === 'Faultier' 
                      ? 'bg-gray-100 dark:bg-gray-800 border-gray-400 shadow-lg' 
                      : 'bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600'
                  }`}>
                    🦥
                  </div>
                  <div className={`mt-2 px-2 py-1 rounded-lg text-xs font-medium transition-all duration-300 ${
                    skillLevel.name === 'Faultier'
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                      : 'text-gray-400 dark:text-gray-600'
                  }`}>
                    Faultier
                  </div>
                </div>

                {/* Panda */}
                <div className={`flex flex-col items-center transition-all duration-300 ${
                  skillLevel.name === 'Panda' ? 'scale-110' : 'scale-90 opacity-60'
                }`}>
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl border-4 transition-all duration-300 ${
                    skillLevel.name === 'Panda' 
                      ? 'bg-orange-100 dark:bg-orange-900/30 border-orange-400 shadow-lg' 
                      : 'bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600'
                  }`}>
                    🐼
                  </div>
                  <div className={`mt-2 px-2 py-1 rounded-lg text-xs font-medium transition-all duration-300 ${
                    skillLevel.name === 'Panda'
                      ? 'bg-orange-200 dark:bg-orange-800/30 text-orange-800 dark:text-orange-200'
                      : 'text-gray-400 dark:text-gray-600'
                  }`}>
                    Panda
                  </div>
                </div>

                {/* Fox */}
                <div className={`flex flex-col items-center transition-all duration-300 ${
                  skillLevel.name === 'Fuchs' ? 'scale-110' : 'scale-90 opacity-60'
                }`}>
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl border-4 transition-all duration-300 ${
                    skillLevel.name === 'Fuchs' 
                      ? 'bg-red-100 dark:bg-red-900/30 border-red-400 shadow-lg' 
                      : 'bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600'
                  }`}>
                    🦊
                  </div>
                  <div className={`mt-2 px-2 py-1 rounded-lg text-xs font-medium transition-all duration-300 ${
                    skillLevel.name === 'Fuchs'
                      ? 'bg-red-200 dark:bg-red-800/30 text-red-800 dark:text-red-200'
                      : 'text-gray-400 dark:text-gray-600'
                  }`}>
                    Fuchs
                  </div>
                </div>
              </div>

              {/* Explanation */}
              <div className={`mx-auto max-w-md p-4 rounded-xl transition-all duration-300 ${skillLevel.bgColor}`}>
                <div className={`text-sm font-medium ${skillLevel.color} mb-1`}>
                  {i18n.language === 'en' ? `You are a ${skillLevel.name} today!` : `Du bist heute ein ${skillLevel.name}!`}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {skillLevel.description}
                </div>
              </div>
              
              <h2 className="text-3xl font-light text-gray-900 dark:text-white mb-2 mt-4">
                {i18n.language === 'en' ? 'End Day' : 'Tag beenden'}
              </h2>
              
              <p className="text-lg text-gray-500 dark:text-gray-400">
                {format(new Date(), 'EEEE, dd. MMMM yyyy', { locale: de })}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto max-h-[60vh]">
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Work Time */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl" style={getAccentColorStyles().bgLight}>
                  <Clock className="w-6 h-6" style={getAccentColorStyles().text} />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-light text-gray-900 dark:text-white">
                    {Math.round(totalWorkedTime / 60 * 10) / 10}h
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {i18n.language === 'en' ? `of ${Math.round(totalEstimatedTime / 60 * 10) / 10}h planned` : `von ${Math.round(totalEstimatedTime / 60 * 10) / 10}h geplant`}
                  </div>
                </div>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                <div 
                  className="h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ 
                    width: `${Math.min(workPercentage, 100)}%`,
                    ...getAccentColorStyles().bg
                  }}
                ></div>
              </div>
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {i18n.language === 'en' ? `Timer Time (${Math.round(workPercentage)}%)` : `Timer-Zeit (${Math.round(workPercentage)}%)`}
              </div>
            </div>

            {/* Completed Tasks */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl" style={getAccentColorStyles().bgLight}>
                  <CheckCircle className="w-6 h-6" style={getAccentColorStyles().text} />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-light text-gray-900 dark:text-white">
                    {completedTasks.length}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    von {todaysTasks.length} Aufgaben
                  </div>
                </div>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                <div 
                  className="h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ 
                    width: `${todaysTasks.length > 0 ? (completedTasks.length / todaysTasks.length) * 100 : 0}%`,
                    ...getAccentColorStyles().bg
                  }}
                ></div>
              </div>
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {i18n.language === 'en' ? 'Completed Tasks' : 'Erledigte Aufgaben'}
              </div>
            </div>
          </div>

          {/* Sync Status & Control block entfernt; Dropbox-Upload wandert nach unten */}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="space-y-4">
            {/* Completed Tasks Section */}
            {completedTasks.length > 0 && (
              <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={getAccentColorStyles().bgLight}>
                    <CheckCircle className="w-4 h-4" style={getAccentColorStyles().text} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {i18n.language === 'en' ? 'Completed Tasks' : 'Erledigte Aufgaben'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {i18n.language === 'en' 
                        ? `${completedTasks.length} task${completedTasks.length !== 1 ? 's' : ''} completed`
                        : `${completedTasks.length} Aufgabe${completedTasks.length !== 1 ? 'n' : ''} abgeschlossen`}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowArchiveConfirm(true)}
                  className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-all hover:opacity-90 hover:shadow-md"
                  style={getAccentColorStyles().bg}
                >
                  <Archive className="w-4 h-4 mr-2 inline" />
                  {i18n.language === 'en' ? 'Archive' : 'Archivieren'}
                </button>
              </div>
            )}

            {/* Incomplete Tasks Section */}
            {incompleteTasks.length > 0 && (
              <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={getAccentColorStyles().bgLight}>
                    <ArrowRight className="w-4 h-4" style={getAccentColorStyles().text} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {i18n.language === 'en' ? 'Incomplete Tasks' : 'Unerledigte Aufgaben'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {i18n.language === 'en' 
                        ? `${incompleteTasks.length} task${incompleteTasks.length !== 1 ? 's' : ''} open`
                        : `${incompleteTasks.length} Aufgabe${incompleteTasks.length !== 1 ? 'n' : ''} offen`}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowMoveConfirm(true)}
                  className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-all hover:opacity-90 hover:shadow-md"
                  style={getAccentColorStyles().bg}
                >
                  <ArrowRight className="w-4 h-4 mr-2 inline" />
                  {todayIsFriday 
                    ? (i18n.language === 'en' ? 'Move to Monday' : 'Auf Montag')
                    : (i18n.language === 'en' ? 'Move to tomorrow' : 'Auf morgen')
                  }
                </button>
              </div>
            )}

            {/* Local Backup Section */}
            <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={getAccentColorStyles().bgLight}>
                  <HardDrive className="w-4 h-4" style={getAccentColorStyles().text} />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {i18n.language === 'en' ? 'Local Backup' : 'Lokales Backup'}
                  </div>
                  {localBackupMsg ? (
                    <div className="text-xs" style={getAccentColorStyles().text}>{localBackupMsg}</div>
                  ) : !hasBackupDir ? (
                    <div className="text-xs text-amber-600 dark:text-amber-400">
                      {i18n.language === 'en' ? 'No backup folder set' : 'Kein Backup-Ordner gewählt'}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {state.preferences.backup?.lastSuccess 
                        ? `${i18n.language === 'en' ? 'Last:' : 'Zuletzt:'} ${format(new Date(state.preferences.backup.lastSuccess), 'dd.MM. HH:mm')}`
                        : (i18n.language === 'en' ? 'No backup yet' : 'Noch kein Backup')
                      }
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={handleLocalBackup}
                disabled={localBackupSaving}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-all hover:opacity-90 hover:shadow-md disabled:opacity-60"
                style={getAccentColorStyles().bg}
              >
                {hasBackupDir ? (
                  <>
                    <HardDrive className="w-4 h-4 mr-2 inline" />
                    {localBackupSaving ? (i18n.language === 'en' ? 'Saving…' : 'Speichern…') : (i18n.language === 'en' ? 'Save Backup' : 'Backup speichern')}
                  </>
                ) : (
                  <>
                    <FolderOpen className="w-4 h-4 mr-2 inline" />
                    {i18n.language === 'en' ? 'Setup' : 'Einrichten'}
                  </>
                )}
              </button>
            </div>

            {/* Dropbox Upload small card (placed after local backup) */}
            {canDropbox && (
              <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={getAccentColorStyles().bgLight}>
                    <Upload className="w-4 h-4" style={getAccentColorStyles().text} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {i18n.language === 'en' ? 'Upload to Dropbox' : 'Zu Dropbox hochladen'}
                    </div>
                    {eodUploadMsg && (
                      <div className="text-xs" style={getAccentColorStyles().text}>{eodUploadMsg}</div>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleDropboxUpload}
                  disabled={eodUploading}
                  className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-all hover:opacity-90 hover:shadow-md disabled:opacity-60"
                  style={getAccentColorStyles().bg}
                >
                  <Upload className="w-4 h-4 mr-2 inline" />
                  {eodUploading ? (i18n.language === 'en' ? 'Uploading…' : 'Hochladen…') : (i18n.language === 'en' ? 'Upload' : 'Hochladen')}
                </button>
              </div>
            )}

            {/* Close Button */}
            <div className="flex justify-center pt-2">
              <button
                onClick={onClose}
                className="px-6 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-all"
              >
                {i18n.language === 'en' ? 'Close' : 'Schließen'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Archive Confirmation */}
      {showArchiveConfirm && (
        <div className={`fixed inset-0 bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-200 ${
          isOnboardingActive ? 'z-[999991]' : 'z-60'
        }`}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {i18n.language === 'en' ? 'Archive Tasks' : 'Aufgaben archivieren'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {i18n.language === 'en' 
                ? `Do you want to move all ${completedTasks.length} completed tasks to the archive?`
                : `Möchten Sie alle ${completedTasks.length} erledigten Aufgaben ins Archiv verschieben?`}
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowArchiveConfirm(false)}
                className="flex-1 px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                {i18n.language === 'en' ? 'Cancel' : 'Abbrechen'}
              </button>
              <button
                onClick={handleArchiveCompleted}
                className="flex-1 px-4 py-2 text-white rounded-xl transition-colors hover:opacity-90"
                style={getAccentColorStyles().bg}
              >
                {i18n.language === 'en' ? 'Archive' : 'Archivieren'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Confirmation */}
      {showMoveConfirm && (
        <div className={`fixed inset-0 bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-200 ${
          isOnboardingActive ? 'z-[999991]' : 'z-60'
        }`}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {i18n.language === 'en' ? 'Move Tasks' : 'Aufgaben verschieben'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {todayIsFriday 
                ? (i18n.language === 'en' 
                    ? `Do you want to move all ${incompleteTasks.length} open tasks to next Monday?`
                    : `Möchten Sie alle ${incompleteTasks.length} offenen Aufgaben auf den kommenden Montag verschieben?`)
                : (i18n.language === 'en' 
                    ? `Do you want to move all ${incompleteTasks.length} open tasks to tomorrow?`
                    : `Möchten Sie alle ${incompleteTasks.length} offenen Aufgaben auf morgen verschieben?`)
              }
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowMoveConfirm(false)}
                className="flex-1 px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                {i18n.language === 'en' ? 'Cancel' : 'Abbrechen'}
              </button>
              <button
                onClick={handleMoveIncomplete}
                className="flex-1 px-4 py-2 text-white rounded-xl transition-colors hover:opacity-90"
                style={getAccentColorStyles().bg}
              >
                {i18n.language === 'en' ? 'Move' : 'Verschieben'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 