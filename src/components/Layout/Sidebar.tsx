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
  ClipboardList,
  RefreshCw,
  StickyNote,
  Pin,
  Upload,
  Download,
  User,
  MoreHorizontal
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { EndOfDayModal } from '../Common/EndOfDayModal';
import { getAssetVersion } from '../../utils/imageUtils';
import { PersonalCapacityModal } from '../Common/PersonalCapacityModal';
import { PlannerAssignmentModal } from '../Common/PlannerAssignmentModal';
import { Task } from '../../types';


interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export const Sidebar = memo(function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const { t } = useTranslation();
  const { state, dispatch } = useApp();
  const [showEndOfDayModal, setShowEndOfDayModal] = useState(false);
  const [showPlannerModal, setShowPlannerModal] = useState(false);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [assignedTask, setAssignedTask] = useState<Task | null>(null);
  const [showPlannerUserMenu, setShowPlannerUserMenu] = useState(false);
  const [showPersonalCapacity, setShowPersonalCapacity] = useState(false);
  const userButtonRef = useRef<HTMLButtonElement | null>(null);
  const [userMenuPos, setUserMenuPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement | null>(null);
  const [moreMenuPos, setMoreMenuPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  
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

  // Dropbox quick actions (sidebar): separate Upload/Download with LED indicators
  const canDropbox = false; // Dropbox sync removed
  const canLocalBackup = !!state.preferences.backup?.enabled && !!(window as any).__taskfuchs_backup_dir__;
  const [uploadLed, setUploadLed] = useState<'idle'|'syncing'|'success'|'error'>('idle');
  const [downloadLed, setDownloadLed] = useState<'idle'|'syncing'|'success'|'error'>('idle');

  const handleUpload = useCallback(async () => {
    if (!canDropbox) return;
    if (!confirm('Sicherung zu Dropbox hochladen?')) return;
    setUploadLed('syncing');
    try {
      const { dropboxUpload } = await import('../../utils/dropboxSync');
      await dropboxUpload(state as any, dispatch as any);
      setUploadLed('success');
      setTimeout(() => setUploadLed('idle'), 1500);
    } catch (e) {
      console.error('Sidebar upload failed', e);
      setUploadLed('error');
    }
  }, [canDropbox, state, dispatch]);

  const handleDownload = useCallback(async () => {
    if (!canDropbox) return;
    if (!confirm('Sicherung von Dropbox herunterladen und laden?')) return;
    setDownloadLed('syncing');
    try {
      const { dropboxDownload } = await import('../../utils/dropboxSync');
      await dropboxDownload(state as any, dispatch as any, 'remote');
      setDownloadLed('success');
      setTimeout(() => setDownloadLed('idle'), 1500);
    } catch (e) {
      console.error('Sidebar download failed', e);
      setDownloadLed('error');
    }
  }, [canDropbox, state, dispatch]);

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
    // Focus entry removed from sidebar
    {
      id: 'review',
      label: t('navigation.review'),
      icon: ClipboardList,
      active: activeView === 'review',
      onClick: () => onViewChange('review')
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
      id: 'notes',
      label: t('navigation.notes'),
      icon: StickyNote,
      active: activeView === 'notes',
      onClick: () => onViewChange('notes')
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
    }
  ], [activeView, onViewChange, t, handleTasksClick, isPlannerDropActive]);

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
  const preferredMoreIds = state.preferences.sidebar?.moreItems || ['series', 'review', 'archive', 'tags', 'statistics'];
  const overflowNavItems = navigationItems.filter(item => preferredMoreIds.includes(item.id));
  const baseNavItems = navigationItems.filter(item => !preferredMoreIds.includes(item.id));

  // Get glass effect classes and minimal design state
  const isMinimalDesign = state.preferences.minimalDesign;
  const glassEffectEnabled = !isMinimalDesign; // Always enable glass when not minimal
  
  const glassClasses = isMinimalDesign
    ? "border-r border-gray-200 dark:border-gray-800"
    : "border-r border-gray-200 dark:border-gray-800";
  
  const sidebarStyle = isMinimalDesign
    ? document.documentElement.classList.contains('dark')
      ? { backgroundColor: '#111827' }
      : { backgroundColor: '#FFFFFF' }
    : document.documentElement.classList.contains('dark')
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
                ? (document.documentElement.classList.contains('dark') ? '#4b5563' : '#6b7280')
                : (document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.2)' : '#6b7280')
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
            className="w-14 h-14 rounded-lg flex items-center justify-center hover:scale-105 transition-transform"
            title={t('header.settings')}
          >
            <User className="w-6 h-6 text-gray-700 dark:text-white" />
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
                    setShowPersonalCapacity(true);
                    setShowPlannerUserMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {t('capacity.personal_capacity')}
                </button>
                <button
                  onClick={() => {
                    try { onViewChange('settings'); } catch {}
                    window.dispatchEvent(new CustomEvent('navigate-to-settings'));
                    setShowPlannerUserMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {t('header.settings')}
                </button>
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('open-user-guide'));
                    setShowPlannerUserMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {t('header.user_guide')}
                </button>
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('start-onboarding'));
                    setShowPlannerUserMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {t('header.onboarding_tour')}
                </button>
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
                    className={`w-full flex flex-col items-center justify-center rounded-lg text-xs font-medium sidebar-item py-3 px-1 gap-1 btn-hover smooth-transform transition-all duration-200 min-h-[60px] ${
                      isActive
                        ? 'bg-[var(--accent-color)] text-white active'
                        : isMinimalDesign
                          ? (document.documentElement.classList.contains('dark')
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
                        : (document.documentElement.classList.contains('dark') ? '#9ca3af' : '#111827')
                    }} />
                    <span className={`text-xs leading-none text-center whitespace-nowrap ${isActive ? "text-white" : "text-gray-900 dark:text-gray-300"}`}>
                      {item.label}
                    </span>
                    {/* Inbox count badge */}
                    {item.id === 'inbox' && (() => {
                      const inboxCount = (state.tasks || []).filter(t => t.columnId === 'inbox').length;
                      return inboxCount > 0 ? (
                        <span className="absolute top-[2px] right-[2px] text-[11px] min-w-[20px] h-[20px] px-1.5 rounded-full flex items-center justify-center text-white shadow font-semibold dark:text-white"
                          style={{ backgroundColor: state.preferences.accentColor }}>
                          {inboxCount}
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
                      ? (document.documentElement.classList.contains('dark')
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

        {/* Bottom section (Dropbox quick actions only) */}
        <div className="sidebar-content px-2 pb-4">
          {/* Dropbox Upload/Download with LEDs */}
          {canDropbox && (
            <div className="mb-2 flex items-center justify-center px-1 space-x-2">
              <button onClick={handleUpload} className="relative w-10 h-10 rounded-full flex items-center justify-center hover:opacity-90 focus:outline-none" title="Hochladen" aria-label="Jetzt hochladen">
                <Upload className="w-5 h-5 text-white" />
                <span className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full pointer-events-none ${uploadLed==='success'?'bg-green-500':uploadLed==='error'?'bg-red-500':uploadLed==='syncing'?'bg-amber-400':'bg-gray-500'}`} />
              </button>
              <button onClick={handleDownload} className="relative w-10 h-10 rounded-full flex items-center justify-center hover:opacity-90 focus:outline-none" title="Herunterladen" aria-label="Jetzt herunterladen">
                <Download className="w-5 h-5 text-white" />
                <span className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full pointer-events-none ${downloadLed==='success'?'bg-green-500':downloadLed==='error'?'bg-red-500':downloadLed==='syncing'?'bg-amber-400':'bg-gray-500'}`} />
              </button>
            </div>
          )}
          {canLocalBackup && (
            <div className="mt-2 flex items-center justify-center px-1">
              <button onClick={async () => {
                try {
                  const dir: any = (window as any).__taskfuchs_backup_dir__;
                  if (!dir) { alert('Kein Backup‑Ordner gewählt.'); return; }
                  const { exportToJSON, writeBackupToDirectory } = await import('../../utils/importExport');
                  const data: any = {
                    tasks: state.tasks,
                    archivedTasks: state.archivedTasks,
                    columns: state.columns,
                    tags: state.tags,
                    notes: state.notes?.notes || state.notes || [],
                    noteLinks: state.noteLinks || [],
                    preferences: state.preferences,
                    viewState: state.viewState || {},
                    projectKanbanColumns: state.viewState?.projectKanban?.columns || [],
                    projectKanbanState: state.viewState?.projectKanban || {},
                    exportDate: new Date().toISOString(),
                    version: '2.3'
                  };
                  const json = exportToJSON(data);
                  const filename = `TaskFuchs_${new Date().toISOString().replace(/[:]/g,'-').slice(0,19)}.json`;
                  await writeBackupToDirectory(dir, filename, json);
                  (window as any).__taskfuchs_backup_toast__ = true;
                } catch (e) {
                  console.error('Manual backup failed', e);
                  alert('Backup fehlgeschlagen.');
                }
              }} className="relative w-10 h-10 rounded-full flex items-center justify-center hover:opacity-90 focus:outline-none" title="Backup jetzt sichern" aria-label="Backup jetzt sichern">
                <Download className="w-5 h-5 text-white" />
              </button>
            </div>
          )}
        </div>

      </div>



      
      {/* End-of-Day Modal */}
      <EndOfDayModal 
        isOpen={showEndOfDayModal}
        onClose={() => setShowEndOfDayModal(false)}
      />

      {/* Personal Capacity Modal */}
      <PersonalCapacityModal
        isOpen={showPersonalCapacity}
        onClose={() => setShowPersonalCapacity(false)}
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
    </>
  );
}); 