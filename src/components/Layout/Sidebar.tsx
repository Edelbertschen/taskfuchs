import React, { useState, useEffect, memo, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useDroppable } from '@dnd-kit/core';
import { 
  Home,
  Tag,
  Archive,
  BarChart3,
  Sparkles,
  Columns,
  Inbox,
  FileText,
  Sun,
  CheckSquare,
  Trophy,
  Target,
  RefreshCw,
  Pin,
  Upload,
  Download,
  User,
  MoreHorizontal,
  HardDrive,
  AlertTriangle,
  Cloud,
  CloudOff,
  ChevronDown,
  Users,
  LogOut,
  Settings,
  Gift,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useGuestMode } from '../../App';
import { EndOfDayModal } from '../Common/EndOfDayModal';
import { getAssetVersion } from '../../utils/imageUtils';
import { PlannerAssignmentModal } from '../Common/PlannerAssignmentModal';
import { Task } from '../../types';


interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export const Sidebar = memo(function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const { t } = useTranslation();
  const { state, dispatch } = useApp();
  const { state: authState, logout } = useAuth();
  const guestModeContext = useGuestMode();
  const isGuestMode = !authState.isOnlineMode;
  const [showEndOfDayModal, setShowEndOfDayModal] = useState(false);
  const [showPlannerModal, setShowPlannerModal] = useState(false);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [assignedTask, setAssignedTask] = useState<Task | null>(null);
  const [showPlannerUserMenu, setShowPlannerUserMenu] = useState(false);
  const userButtonRef = useRef<HTMLButtonElement | null>(null);
  const [userMenuPos, setUserMenuPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement | null>(null);
  const [moreMenuPos, setMoreMenuPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const [backupButtonPressed, setBackupButtonPressed] = useState(false);
  const [backupRunning, setBackupRunning] = useState(false);
  const [showBackupSuccess, setShowBackupSuccess] = useState(false);
  const [backupContextMenu, setBackupContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [backupDirName, setBackupDirName] = useState<string | null>(null);
  
  // Reactive dark mode check based on theme preference
  const isDarkMode = state.preferences.theme === 'dark' || 
    (state.preferences.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  // Detect if running in Electron
  const isElectron = !!(window as any).require;
  
  // Use correct logo path for Electron vs Web (versioned to bust caches in PWA)
  const baseLogoPath = isElectron ? 'foxiconsb.svg' : '/foxiconsb.svg';
  const assetVersion = getAssetVersion();
  const logoPath = isElectron ? baseLogoPath : `${baseLogoPath}${assetVersion ? `?v=${assetVersion}` : ''}`;

  const handleTasksClick = useCallback(() => {
    onViewChange('tasks');
    dispatch({ type: 'NAVIGATE_DATE', payload: 'today' });
  }, [onViewChange, dispatch]);

  // Dropbox sync status - only show when actually connected (has access token)
  const dropboxConnected = !!state.preferences.dropbox?.enabled && 
    !!state.preferences.dropbox?.appKey && 
    !!(state.preferences.dropbox?.accessToken || state.preferences.dropbox?.refreshToken);
  const [canLocalBackup, setCanLocalBackup] = useState(false);
  const [dropboxSyncStatus, setDropboxSyncStatus] = useState<'idle'|'syncing'|'success'|'error'>('idle');
  const [dropboxSyncMessage, setDropboxSyncMessage] = useState('');

  // Check backup configuration status
  useEffect(() => {
    const checkBackupStatus = async () => {
      try {
        const { backupService } = await import('../../utils/backupService');
        const isConfigured = backupService.isConfigured();
        setCanLocalBackup(isConfigured);
        setBackupDirName(backupService.getDirectoryName());
        
        // Subscribe to changes
        const unsubscribe = backupService.subscribe(() => {
          setCanLocalBackup(backupService.isConfigured());
          setBackupDirName(backupService.getDirectoryName());
        });
        
        return unsubscribe;
      } catch {
        setCanLocalBackup(false);
        setBackupDirName(null);
      }
    };
    
    let unsubscribe: (() => void) | undefined;
    checkBackupStatus().then(unsub => { unsubscribe = unsub; });
    
    return () => { unsubscribe?.(); };
  }, []);

  // Handle Dropbox sync
  const handleDropboxSync = useCallback(async () => {
    if (!dropboxConnected) return;
    
    setDropboxSyncStatus('syncing');
    setDropboxSyncMessage('Synchronisiere...');
    
    try {
      const { dropboxSync } = await import('../../utils/dropboxSync');
      const { getDropboxClient: getClient } = await import('../../utils/dropboxClient');
      
      const prefs = state.preferences.dropbox;
      if (!prefs?.appKey) throw new Error('Dropbox nicht konfiguriert');
      
      // Initialize client
      const client = getClient(prefs.appKey);
      if (!client.isAuthenticated()) {
        throw new Error('Nicht mit Dropbox verbunden');
      }
      
      const passphrase = prefs.rememberPassphrase ? localStorage.getItem('taskfuchs_dropbox_passphrase') || '' : '';
      
      const result = await dropboxSync(state, dispatch, {
        folderPathOverride: prefs.folderPath,
        passphraseOverride: passphrase,
      });
      
      if (result.status === 'error' || result.status === 'conflict') {
        setDropboxSyncStatus('error');
        setDropboxSyncMessage(result.message);
        setTimeout(() => setDropboxSyncStatus('idle'), 3000);
      } else {
        setDropboxSyncStatus('success');
        setDropboxSyncMessage(result.message);
        setTimeout(() => setDropboxSyncStatus('idle'), 2000);
      }
      
      // Update preferences
      dispatch({ type: 'UPDATE_PREFERENCES', payload: { dropbox: {
        ...prefs,
        lastSync: new Date().toISOString(),
        lastSyncStatus: result.status === 'error' ? 'error' : 'success',
        lastSyncError: result.status === 'error' ? result.message : undefined,
      } } });
      
    } catch (e: any) {
      console.error('Dropbox sync failed', e);
      setDropboxSyncStatus('error');
      setDropboxSyncMessage(e?.message || 'Sync fehlgeschlagen');
      setTimeout(() => setDropboxSyncStatus('idle'), 3000);
    }
  }, [dropboxConnected, state, dispatch]);

  // Listen for sync complete events from auto-sync
  useEffect(() => {
    const handleSyncComplete = (e: CustomEvent) => {
      const result = e.detail;
      if (result.status === 'error' || result.status === 'conflict') {
        setDropboxSyncStatus('error');
      } else if (result.status === 'pushed' || result.status === 'pulled') {
        setDropboxSyncStatus('success');
        setTimeout(() => setDropboxSyncStatus('idle'), 2000);
    }
    };
    
    window.addEventListener('dropbox-sync-complete', handleSyncComplete as any);
    return () => window.removeEventListener('dropbox-sync-complete', handleSyncComplete as any);
  }, []);

  const handleManualBackup = useCallback(async () => {
    // Visual feedback: button press
    setBackupButtonPressed(true);
    setTimeout(() => setBackupButtonPressed(false), 200);
    
    // Start backup - show pulsing
    setBackupRunning(true);
    
    try {
      const { backupService } = await import('../../utils/backupService');
      
      if (!backupService.isConfigured()) { 
        // Open backup setup modal instead of alert
        window.dispatchEvent(new CustomEvent('open-backup-setup'));
        setBackupRunning(false);
        return; 
      }
      
      const data = {
        tasks: state.tasks,
        archivedTasks: state.archivedTasks || [],
        columns: state.columns,
        tags: state.tags,
        boards: (state as any).boards || [],
        preferences: state.preferences,
        viewState: state.viewState || {},
        projectKanbanColumns: state.viewState?.projectKanban?.columns || [],
        projectKanbanState: state.viewState?.projectKanban || {},
        pinColumns: state.pinColumns || [],
        recurrence: (state as any).recurrence || {},
        events: state.events || [],
        calendarSources: state.calendarSources || [],
        exportDate: new Date().toISOString(),
        version: '3.0'
      };
      
      const result = await backupService.createBackup(data);
      
      // Backup complete
      setBackupRunning(false);
      
      if (result.success) {
        // Update last backup time in preferences
        dispatch({ 
          type: 'UPDATE_PREFERENCES', 
          payload: { 
            backup: { 
              ...state.preferences.backup, 
              lastSuccess: result.timestamp 
            } 
          } 
        });
      
        // Show success (green) for 10 seconds
      setShowBackupSuccess(true);
        setTimeout(() => setShowBackupSuccess(false), 10000);
      } else {
        alert((t('backup.failed') || 'Backup fehlgeschlagen: ') + result.error);
      }
    } catch (e) {
      console.error('Manual backup failed', e);
      setBackupRunning(false);
      alert(t('backup.failed') || 'Backup fehlgeschlagen.');
    }
  }, [state, t, dispatch]);

  // Handle right-click on backup button to show context menu
  const handleBackupContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBackupContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  // Close backup context menu when clicking outside
  useEffect(() => {
    if (!backupContextMenu) return;
    const handleClick = () => setBackupContextMenu(null);
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setBackupContextMenu(null); };
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [backupContextMenu]);

  // Drop target for planner
  const {
    setNodeRef: setPlannerDropRef,
    isOver: isPlannerDropActive,
  } = useDroppable({
    id: 'planner-drop-zone',
    data: {
      type: 'planner-assignment',
    },
  });

  const handlePlannerDrop = (task: Task) => {
    setDraggedTask(task);
    setShowPlannerModal(true);
  };

  // Auto-close sidebar menus on outside click and on view change
  useEffect(() => {
    const closeAllMenus = () => {
      setShowPlannerUserMenu(false);
      setShowMoreMenu(false);
    };
    document.addEventListener('mousedown', closeAllMenus);
    window.addEventListener('resize', closeAllMenus);
    return () => {
      document.removeEventListener('mousedown', closeAllMenus);
      window.removeEventListener('resize', closeAllMenus);
    };
  }, []);

  useEffect(() => {
    // Close menus when navigating to another view
    setShowPlannerUserMenu(false);
    setShowMoreMenu(false);
  }, [activeView]);

  // Listen for planner assignment events from drag & drop
  useEffect(() => {
    const handlePlannerAssignment = (event: any) => {
      if (event.detail && event.detail.task) {
        handlePlannerDrop(event.detail.task);
      }
    };

    window.addEventListener('plannerAssignment', handlePlannerAssignment);
    return () => {
      window.removeEventListener('plannerAssignment', handlePlannerAssignment);
    };
  }, []);

  const handleDateAssignment = (dateString: string) => {
    if (draggedTask) {
      dispatch({
        type: 'UPDATE_TASK',
        payload: {
          ...draggedTask,
          dueDate: dateString,
          updatedAt: new Date().toISOString(),
        },
      });
      
      // Store assigned task for notification
      setAssignedTask(draggedTask);
      
      // Show success notification
      setShowSuccessNotification(true);
      setTimeout(() => {
        setShowSuccessNotification(false);
        setAssignedTask(null);
      }, 3000);
      
      setDraggedTask(null);
    }
  };

  // JSON Export function - IDENTISCH zu Settings.tsx
  const handleJsonExport = useCallback(() => {
    const dataToExport = {
      // Aufgaben und Archiv
      tasks: state.tasks,
      archivedTasks: state.archivedTasks,
      
      // Strukturen
      columns: state.columns,
      tags: state.tags,
      kanbanBoards: state.kanbanBoards,
      
      // 🎯 PIN SYSTEM - NEU!
      pinColumns: state.pinColumns,
      
      // Notizen (inkl. Daily Notes & Emails)
      notes: state.notes.notes,
      noteLinks: state.noteLinks,
      notesViewState: {
        selectedNote: state.notes.selectedNote,
        isEditing: state.notes.isEditing,
        searchQuery: state.notes.searchQuery,
        selectedTags: state.notes.selectedTags,
        view: state.notes.view,
        sortBy: state.notes.sortBy,
        sortOrder: state.notes.sortOrder,
        showArchived: state.notes.showArchived,
        showLinkPreviews: state.notes.showLinkPreviews,
        editorMode: state.notes.editorMode,
        dailyNotesMode: state.notes.dailyNotesMode,
        emailMode: state.notes.emailMode, // 📧 E-MAIL MODUS - NEU!
        selectedDailyNoteDate: state.notes.selectedDailyNoteDate,
      },
      
      // Einstellungen und Ansichten
      preferences: state.preferences,
      viewState: state.viewState,
      // 📋 Projekt-Kanban-Spalten explizit exportieren für Rückwärtskompatibilität
      projectKanbanColumns: state.viewState.projectKanban.columns,
      projectKanbanState: state.viewState.projectKanban,
      
      // Kalender-Daten (iCal-Einstellungen)
      events: state.events,
      calendarSources: state.calendarSources,
      ical: {
        preferences: state.preferences.calendars,
        sources: state.calendarSources,
      },
      
      // Bilder-Speicher
      imageStorage: state.imageStorage,
      
      // Zusätzliche Daten
      searchQuery: state.searchQuery,
      activeTagFilters: state.activeTagFilters,
      activePriorityFilters: state.activePriorityFilters,
      focusMode: state.focusMode,
      focusedColumnId: state.focusedColumnId,
      showCompletedTasks: state.showCompletedTasks,
      projectColumnOffset: state.projectColumnOffset,
      notifications: state.notifications,
      
      // Timer-Status
      activeTimer: state.activeTimer,
      
      // Datum und Ansichtsstatus
      currentDate: state.currentDate.toISOString(),
      isNoteEditorFullScreen: state.isNoteEditorFullScreen,
      
      // Wiederholungsregeln
      recurrence: state.recurrence,
      
      // 🕒 Zeitbudget-Features
      personalCapacity: state.personalCapacity,
      
      // Metadaten
      exportDate: new Date().toISOString(),
      version: '2.3', // ✨ Vollständiger Export mit Zeitbudget-Features
      metadata: {
        totalTasks: state.tasks.length,
        totalArchivedTasks: state.archivedTasks.length,
        totalNotes: state.notes.notes.length,
        totalDailyNotes: state.notes.notes.filter(note => note.dailyNote).length,
        totalEmailNotes: state.notes.notes.filter(note => note.metadata?.emailMetadata).length, // 📧 E-MAIL STATISTIK
        totalTags: state.tags.length,
        totalBoards: state.kanbanBoards.length,
        totalColumns: state.columns.length,
        totalPinColumns: state.pinColumns.length, // 🎯 PIN STATISTIK
        totalNoteLinks: state.noteLinks.length,
        totalImages: state.imageStorage.images.length,
        totalNotifications: state.notifications.length,
        totalEvents: state.events.length,
        totalCalendarSources: state.calendarSources.length,
        hasActiveTimer: !!state.activeTimer,
        // 🕒 Zeitbudget-Metadaten
        hasPersonalCapacity: !!state.personalCapacity,
        projectsWithTimebudgets: state.columns.filter(col => col.type === 'project' && col.timebudget).length,
        appVersion: '2.3', // ✨ App-Version mit Zeitbudget-Features
        dataSize: 0, // Wird unten berechnet
        exportTime: Date.now()
      }
    };
    
    // Datengröße berechnen
    const jsonString = JSON.stringify(dataToExport, null, 2);
    dataToExport.metadata.dataSize = jsonString.length;
    
    // Finaler Export-String
    const finalContent = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([finalContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `taskfuchs-vollstaendig-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [state]);

  const allNavigationItems = useMemo(() => [
    {
      id: 'today',
      label: t('navigation.today'),
      icon: Home,
      active: activeView === 'today',
      onClick: () => onViewChange('today')
    },
    {
      id: 'inbox',
      label: t('navigation.inbox'),
      icon: Inbox,
      active: activeView === 'inbox',
      onClick: () => onViewChange('inbox')
    },
    {
      id: 'tasks',
      label: t('navigation.planner'),
      icon: CheckSquare,
      active: activeView === 'tasks',
      onClick: handleTasksClick,
      dropTarget: true,
      dropRef: setPlannerDropRef,
      isDropActive: isPlannerDropActive
    },
    {
      id: 'kanban',
      label: t('navigation.projects'),
      icon: Columns,
      active: activeView === 'kanban',
      onClick: () => onViewChange('kanban')
    },
    {
      id: 'pins',
      label: t('navigation.pins'),
      icon: Pin,
      active: activeView === 'pins',
      onClick: () => onViewChange('pins')
    },
    {
      id: 'series',
      label: t('navigation.series'),
      icon: RefreshCw,
      active: activeView === 'series',
      onClick: () => onViewChange('series')
    },
    {
      id: 'tags',
      label: t('navigation.tags'),
      icon: Tag,
      active: activeView === 'tags',
      onClick: () => onViewChange('tags')
    },
    {
      id: 'statistics',
      label: t('navigation.reports'),
      icon: BarChart3,
      active: activeView === 'statistics',
      onClick: () => onViewChange('statistics')
    },
    {
      id: 'archive',
      label: t('navigation.archive'),
      icon: Archive,
      active: activeView === 'archive',
      onClick: () => onViewChange('archive')
    },
    // Admin only item - conditionally rendered
    ...(authState.isAdmin ? [{
      id: 'admin',
      label: t('navigation.admin', 'Admin'),
      icon: Users,
      active: activeView === 'admin',
      onClick: () => onViewChange('admin')
    }] : [])
  ], [activeView, onViewChange, t, handleTasksClick, isPlannerDropActive, authState.isAdmin]);

  // Filter and order navigation items based on preferences
  const navigationItems = (() => {
    const hiddenItems = state.preferences.sidebar?.hiddenItems || [];
    const itemOrder = state.preferences.sidebar?.itemOrder || [];
    
    // Create ordered list based on preferences
    const orderedItems = itemOrder
      .map(id => allNavigationItems.find(item => item.id === id))
      .filter(item => item && !hiddenItems.includes(item.id))
      .filter(Boolean);
    
    // Add any items not in the order list (for backwards compatibility)
    const remainingItems = allNavigationItems.filter(item => 
      !itemOrder.includes(item.id) && !hiddenItems.includes(item.id)
    );
    
    return [...orderedItems, ...remainingItems];
  })();

  // Define overflow into "Mehr" menu from preferences (fallback to defaults)
  const preferredMoreIds = state.preferences.sidebar?.moreItems || ['series', 'archive', 'tags', 'statistics'];
  const overflowNavItems = navigationItems.filter(item => preferredMoreIds.includes(item.id));
  const baseNavItems = navigationItems.filter(item => !preferredMoreIds.includes(item.id));

  // Get glass effect classes and minimal design state
  const isMinimalDesign = state.preferences.minimalDesign;
  const glassEffectEnabled = !isMinimalDesign; // Always enable glass when not minimal
  
  const glassClasses = isMinimalDesign
    ? "border-r border-gray-200 dark:border-gray-800"
    : "border-r border-gray-200 dark:border-gray-800";
  
  const sidebarStyle = isMinimalDesign
    ? isDarkMode
      ? { backgroundColor: '#111827' }
      : { backgroundColor: '#FFFFFF' }
    : isDarkMode
      ? { backgroundColor: '#111827' }
      : { backgroundColor: '#FFFFFF' };

  // Create exact accent color logo using CSS mask technique
  const getLogoMaskStyle = (accentColor: string) => {
    return {
      maskImage: `url(${logoPath})`,
      WebkitMaskImage: `url(${logoPath})`,
      maskSize: 'contain',
      WebkitMaskSize: 'contain',
      maskRepeat: 'no-repeat',
      WebkitMaskRepeat: 'no-repeat',
      maskPosition: 'center',
      WebkitMaskPosition: 'center',
      backgroundColor: accentColor,
      width: '48px',
      height: '48px'
    };
  };



  return (
    <>
      <div className={`sidebar ${glassClasses} flex flex-col h-full relative z-30 sidebar-container w-20 sidebar-slide-in smooth-scroll`} style={{...sidebarStyle, textRendering: 'optimizeLegibility', WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale', transform: 'translateZ(0)'}}>
        {/* Logo */}
        <div 
          className={`flex items-center justify-center sidebar-content relative border-b-2`}
          style={{ 
            height: '68px',
            minHeight: '68px',
            maxHeight: '68px',
            boxSizing: 'border-box',
            borderBottomColor: `${
              isMinimalDesign 
                ? (isDarkMode ? '#4b5563' : '#6b7280')
                : (isDarkMode ? 'rgba(255, 255, 255, 0.2)' : '#d1d5db')
            }`
          }}
        >
          <button
            ref={userButtonRef}
            onClick={() => {
              setShowPlannerUserMenu(prev => {
                const willOpen = !prev;
                if (willOpen && userButtonRef.current) {
                  const rect = userButtonRef.current.getBoundingClientRect();
                  setUserMenuPos({ left: rect.left + 8, top: rect.bottom + 8 });
                }
                return willOpen;
              });
            }}
            className="w-14 h-14 rounded-lg flex items-center justify-center hover:scale-105 transition-transform group relative"
            title={t('header.settings')}
          >
            <div className="flex flex-col items-center gap-0.5">
            <User className="w-6 h-6 text-gray-700 dark:text-white" />
              {/* Elegant dropdown indicator */}
              <ChevronDown 
                className={`w-3.5 h-3.5 transition-all duration-200 ${
                  showPlannerUserMenu 
                    ? 'text-gray-700 dark:text-white rotate-180' 
                    : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                }`} 
              />
            </div>
          </button>

          {showPlannerUserMenu && createPortal(
            <div
              className="fixed w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl"
              style={{ left: userMenuPos.left, top: userMenuPos.top, zIndex: 100000 }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="py-2">
                <button
                  onClick={() => {
                    try { onViewChange('settings'); } catch {}
                    window.dispatchEvent(new CustomEvent('navigate-to-settings'));
                    setShowPlannerUserMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"
                >
                  <Settings className="w-4 h-4" />
                  {t('header.settings')}
                </button>
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('start-onboarding'));
                    setShowPlannerUserMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"
                >
                  <Sparkles className="w-4 h-4" />
                  {t('header.onboarding_tour')}
                </button>
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('open-changelog'));
                    setShowPlannerUserMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"
                >
                  <Gift className="w-4 h-4" />
                  {t('header.whats_new', 'Was gibt es Neues?')}
                </button>
                
                {/* Divider */}
                <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                
                {/* Sign Out / Go Online */}
                {isGuestMode && !guestModeContext?.isOfflineOnly ? (
                  <button
                    onClick={() => {
                      guestModeContext?.goOnline();
                      setShowPlannerUserMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"
                  >
                    <Cloud className="w-4 h-4" />
                    {t('auth.goOnline', 'Mit Microsoft anmelden')}
                  </button>
                ) : !isGuestMode ? (
                  <button
                    onClick={() => {
                      logout();
                      setShowPlannerUserMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"
                  >
                    <LogOut className="w-4 h-4" />
                    {t('auth.logout', 'Abmelden')}
                  </button>
                ) : null}
              </div>
            </div>,
            document.body
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 sidebar-content py-4 px-2 overflow-y-auto">
          <div className="space-y-2">
            {baseNavItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = item.active;
              const isDropTarget = item.dropTarget;
              const isDropActive = item.isDropActive;
              
              return (
                <div key={item.id} className="relative group sidebar-nav-item">
                  <button
                    ref={isDropTarget ? item.dropRef : undefined}
                    onClick={item.onClick}
                    data-nav-item={item.id}
                    className={`w-full flex flex-col items-center justify-center rounded-lg text-xs font-medium sidebar-item py-3 px-1 gap-1 btn-hover smooth-transform transition-all duration-200 min-h-[60px] ${
                      isActive
                        ? 'bg-[var(--accent-color)] text-white active'
                        : isMinimalDesign
                          ? (isDarkMode
                              ? 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-900 dark:hover:text-white'
                              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800')
                          : (glassEffectEnabled 
                              ? 'text-gray-200 hover:bg-white/20' 
                              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800')
                    } ${
                      isDropActive 
                        ? 'transform scale-105 shadow-xl' 
                        : ''
                    }`}
                    style={isDropActive ? {
                      backgroundColor: `${state.preferences.accentColor}20`,
                      boxShadow: `0 0 0 2px ${state.preferences.accentColor}`,
                    } : {}}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 transition-all duration-200 ${
                      isDropActive ? "animate-pulse" : ""
                    }`}
                    style={{
                      color: isActive 
                        ? 'white'
                        : (isDarkMode ? '#9ca3af' : '#111827')
                    }} />
                    <span className={`text-xs leading-none text-center whitespace-nowrap ${isActive ? "text-white" : "text-gray-900 dark:text-gray-300"}`}>
                      {item.label}
                    </span>
                    {/* Inbox count badge - only count true inbox tasks (no date, no project, not completed) */}
                    {item.id === 'inbox' && (() => {
                      const inboxCount = (state.tasks || []).filter(t => 
                        t.columnId === 'inbox' && 
                        !t.reminderDate && 
                        !t.projectId && 
                        !t.completed
                      ).length;
                      return inboxCount > 0 ? (
                        <span className="absolute top-[2px] right-[2px] text-[11px] min-w-[20px] h-[20px] px-1.5 rounded-full flex items-center justify-center text-white shadow font-semibold dark:text-white"
                          style={{ backgroundColor: state.preferences.accentColor }}>
                          {inboxCount}
                        </span>
                      ) : null;
                    })()}

                    {/* Today view count badge */}
                    {item.id === 'today' && (() => {
                      const today = new Date().toISOString().split('T')[0];
                      const todayColumnId = `date-${today}`;
                      const todayCount = (state.tasks || []).filter(t => t.columnId === todayColumnId && !t.completed).length;
                      return todayCount > 0 ? (
                        <span className="absolute top-[2px] right-[2px] text-[11px] min-w-[20px] h-[20px] px-1.5 rounded-full flex items-center justify-center text-white shadow font-semibold dark:text-white"
                          style={{ backgroundColor: state.preferences.accentColor }}>
                          {todayCount}
                        </span>
                      ) : null;
                    })()}

                    {/* Planner (Today) count badge */}
                    {item.id === 'tasks' && (() => {
                      const today = new Date().toISOString().split('T')[0];
                      const todayColumnId = `date-${today}`;
                      const todayCount = (state.tasks || []).filter(t => t.columnId === todayColumnId && !t.completed).length;
                      return todayCount > 0 ? (
                        <span className="absolute top-[2px] right-[2px] text-[11px] min-w-[20px] h-[20px] px-1.5 rounded-full flex items-center justify-center text-white shadow font-semibold dark:text-white"
                          style={{ backgroundColor: state.preferences.accentColor }}>
                          {todayCount}
                        </span>
                      ) : null;
                    })()}
                    
                    {/* Drop indicator */}
                    {isDropActive && (
                      <div 
                        className="absolute inset-0 rounded-lg border-2 border-dashed animate-pulse"
                        style={{ borderColor: state.preferences.accentColor }}
                      />
                    )}
                  </button>
                  
                  {/* Drop zone tooltip */}
                  {isDropActive && (
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 z-50">
                      <div 
                        className="px-2 py-1 rounded text-xs text-white font-medium whitespace-nowrap shadow-lg"
                        style={{ backgroundColor: state.preferences.accentColor }}
                      >
                        {t('actions.assign_task')}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* More menu entry aggregating overflow items */}
            {overflowNavItems.length > 0 && (
              <div className="relative group sidebar-nav-item">
                <button
                  ref={moreButtonRef}
                  onClick={() => {
                    setShowMoreMenu(prev => {
                      const willOpen = !prev;
                      if (willOpen && moreButtonRef.current) {
                        const rect = moreButtonRef.current.getBoundingClientRect();
                        setMoreMenuPos({ left: rect.left + 8, top: rect.bottom + 8 });
                      }
                      return willOpen;
                    });
                  }}
                  className={`w-full flex flex-col items-center justify-center rounded-lg text-xs font-medium sidebar-item py-3 px-1 gap-1 btn-hover smooth-transform transition-all duration-200 min-h-[60px] ${
                    isMinimalDesign
                      ? (isDarkMode
                          ? 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-900 dark:hover:text-white'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800')
                      : (glassEffectEnabled 
                          ? 'text-gray-200 hover:bg-white/20' 
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800')
                  }`}
                >
                  <MoreHorizontal className="w-5 h-5 flex-shrink-0 text-gray-700 dark:text-gray-300" />
                  <span className="text-xs leading-none text-center whitespace-nowrap text-gray-700 dark:text-gray-300">{t('common.more', { defaultValue: 'Mehr' })}</span>
                </button>
                {showMoreMenu && createPortal(
                  <div className="fixed w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl" style={{ left: moreMenuPos.left, top: moreMenuPos.top, zIndex: 100000 }} onMouseDown={(e) => e.stopPropagation()}>
                    <div className="py-2">
                      {overflowNavItems.map((item) => (
                        <button key={item.id} onClick={() => { item.onClick(); setShowMoreMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2">
                          <item.icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>,
                  document.body
                )}
              </div>
            )}
          </div>
        </nav>

        {/* Bottom section (Backup) - Only show in guest mode, not in online mode */}
        {isGuestMode && (
          <div className="sidebar-content px-2 pb-4">
            {canLocalBackup && (
              <div className="mt-2 flex flex-col items-center px-1">
                <button 
                  onClick={handleManualBackup}
                  onContextMenu={handleBackupContextMenu}
                  disabled={backupRunning}
                  data-backup-button
                  className={`
                    relative w-10 h-10 rounded-full flex items-center justify-center 
                    transition-all duration-200
                    ${backupButtonPressed ? 'scale-90' : 'scale-100'}
                    ${backupRunning ? 'animate-pulse' : ''}
                    ${showBackupSuccess
                      ? 'bg-green-500 text-white'
                      : isDarkMode
                        ? 'bg-gray-700/50 hover:bg-gray-600/60 text-gray-400 hover:text-gray-300'
                        : 'bg-gray-200/60 hover:bg-gray-300/70 text-gray-500 hover:text-gray-600'
                    }
                    focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2
                    dark:focus:ring-offset-gray-900
                  `}
                  title={`${t('backup.manual_backup') || 'Backup jetzt sichern'}${backupDirName ? ` (${backupDirName})` : ''}`} 
                  aria-label={t('backup.manual_backup') || 'Backup jetzt sichern'}
                >
                  <HardDrive className="w-5 h-5" />
                </button>
              </div>
            )}
            {/* Backup Warning Icon - show when backup is not configured */}
            {!canLocalBackup && (
              <div className="mt-2 flex items-center justify-center px-1">
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('open-backup-setup'))}
                  onContextMenu={handleBackupContextMenu}
                  className={`
                    relative w-10 h-10 rounded-full flex items-center justify-center 
                    transition-all duration-200 hover:scale-105
                    ${(state.preferences as any).design?.mode === 'minimal'
                      ? 'bg-amber-500 hover:bg-amber-600 text-white'
                      : isDarkMode
                        ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-400'
                        : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600'
                    }
                    focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2
                    dark:focus:ring-offset-gray-900
                    animate-pulse
                  `}
                  title={t('backup.setup_backup') || 'Backup einrichten'} 
                  aria-label={t('backup.setup_backup') || 'Backup einrichten'}
                >
                  <AlertTriangle className="w-5 h-5" />
                </button>
              </div>
            )}

          </div>
        )}

      </div>



      
      {/* Backup Context Menu - Only show in guest mode */}
      {isGuestMode && backupContextMenu && createPortal(
        <div 
          className="fixed z-[99999] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[180px] animate-in fade-in zoom-in-95 duration-150"
          style={{ 
            left: Math.min(backupContextMenu.x, window.innerWidth - 200),
            top: Math.min(backupContextMenu.y, window.innerHeight - 100),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
            onClick={() => {
              setBackupContextMenu(null);
              window.dispatchEvent(new CustomEvent('open-backup-setup'));
            }}
          >
            <HardDrive className="w-4 h-4" style={{ color: state.preferences.accentColor }} />
            {t('backup.configure') || 'Backup konfigurieren'}
          </button>
          {canLocalBackup && (
            <button
              className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
              onClick={() => {
                setBackupContextMenu(null);
                handleManualBackup();
              }}
            >
              <Download className="w-4 h-4" style={{ color: state.preferences.accentColor }} />
              {t('backup.backup_now') || 'Jetzt sichern'}
            </button>
          )}
        </div>,
        document.body
      )}
      
      {/* End-of-Day Modal */}
      <EndOfDayModal 
        isOpen={showEndOfDayModal}
        onClose={() => setShowEndOfDayModal(false)}
      />

      {/* Planner Assignment Modal */}
      <PlannerAssignmentModal
        isOpen={showPlannerModal}
        onClose={() => setShowPlannerModal(false)}
        task={draggedTask}
        onAssign={handleDateAssignment}
      />

      {/* Success Notification */}
      {showSuccessNotification && (
        <div className="fixed top-20 right-4 z-50">
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 border-l-4 assignment-success flex items-center space-x-3 min-w-[280px]"
            style={{ borderLeftColor: state.preferences.accentColor }}
          >
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${state.preferences.accentColor}20` }}
            >
              <svg 
                className="w-5 h-5"
                style={{ color: state.preferences.accentColor }}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100 dark:text-white text-sm">
                {t('actions.task_assigned')}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('actions.task_assigned_to_planner', { title: assignedTask?.title })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Backup Success Notification */}
      {showBackupSuccess && (
        <div className="fixed top-20 right-4 z-50 animate-slide-in-right">
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 border-l-4 border-green-500 flex items-center space-x-3 min-w-[280px]"
          >
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center bg-green-500/20"
            >
              <svg 
                className="w-5 h-5 text-green-500"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white text-sm">
                {t('backup.success_title') || 'Backup erfolgreich'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('backup.success_message') || 'Deine Daten wurden sicher gespeichert'}
              </p>
            </div>
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes slide-in-right {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          
          .animate-slide-in-right {
            animation: slide-in-right 0.3s ease-out;
          }
        `}
      </style>
    </>
  );
}); 