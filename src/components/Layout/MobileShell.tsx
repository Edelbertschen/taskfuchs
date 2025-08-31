import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Inbox, CalendarDays, Upload, Download, Plus, Menu } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { InboxView } from '../Inbox/InboxView';
import { TaskColumn } from '../Tasks/TaskColumn';
import type { Column, Task } from '../../types';
import { format, addDays, isToday } from 'date-fns';
import { SmartTaskModal } from '../Tasks/SmartTaskModal';
import { MobileSnackbar } from '../Common/MobileSnackbar';

export function MobileShell() {
  const { state, dispatch } = useApp();
  const [tab, setTab] = useState<'inbox'|'today'>('today');
  const accent = state.preferences.accentColor;
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const touchStartX = useRef<number | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [menuOpen, setMenuOpen] = useState(false);
  const edgeStartRef = useRef<boolean>(false);
  const menuTouchStartX = useRef<number | null>(null);

  // Request notifications permission on first load
  useEffect(() => {
    try {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    } catch {}
  }, []);

  // Disable global background image on mobile shell; restore on unmount
  useEffect(() => {
    try {
      const root = document.documentElement;
      const body = document.body;
      const prevRootBg = root.style.background;
      const prevRootBgImg = (root.style as any).backgroundImage;
      const prevBodyBg = body.style.background;
      const prevBodyBgImg = (body.style as any).backgroundImage;

      const base = root.classList.contains('dark') ? '#111827' : '#ffffff';
      root.style.backgroundImage = 'none';
      root.style.background = base;
      body.style.backgroundImage = 'none';
      body.style.background = base;

      return () => {
        root.style.background = prevRootBg;
        (root.style as any).backgroundImage = prevRootBgImg;
        body.style.background = prevBodyBg;
        (body.style as any).backgroundImage = prevBodyBgImg;
      };
    } catch {}
  }, []);

  const handleUpload = useCallback(async () => {
    if (!state.preferences.dropbox?.enabled) return alert('Dropbox nicht verbunden.');
    if (!confirm('Sicherung zu Dropbox hochladen?')) return;
    try {
      const { dropboxUpload } = await import('../../utils/dropboxSync');
      await dropboxUpload(state as any, dispatch as any);
      setSnackbarMsg('Upload erfolgreich');
      setSnackbarOpen(true);
    } catch (e: any) {
      setSnackbarMsg(`Upload fehlgeschlagen`);
      setSnackbarOpen(true);
    }
  }, [state, dispatch]);

  const handleDownload = useCallback(async () => {
    if (!state.preferences.dropbox?.enabled) return alert('Dropbox nicht verbunden.');
    if (!confirm('Von Dropbox herunterladen und laden?')) return;
    try {
      const { dropboxDownload } = await import('../../utils/dropboxSync');
      await dropboxDownload(state as any, dispatch as any, 'remote');
      setSnackbarMsg('Download abgeschlossen');
      setSnackbarOpen(true);
    } catch (e: any) {
      setSnackbarMsg('Download fehlgeschlagen');
      setSnackbarOpen(true);
    }
  }, [state, dispatch]);

  // Swipe handling:
  // - In Heute: horizontal swipe navigates to prev/next day
  // - In Inbox: swipe switches tabs (as vorher)
  const onTouchStart = (e: React.TouchEvent) => {
    const x = e.touches[0].clientX;
    touchStartX.current = x;
    edgeStartRef.current = x <= 24; // Left edge gesture to open menu
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (edgeStartRef.current && dx > 40) {
      // Edge swipe from left → open menu
      setMenuOpen(true);
      edgeStartRef.current = false;
      return;
    }
    edgeStartRef.current = false;
    if (Math.abs(dx) < 40) return;
    if (tab === 'today') {
      // swipe left → next day, swipe right → previous day
      setCurrentDate(prev => addDays(prev, dx < 0 ? 1 : -1));
      // ensure date column exists (best effort)
      try {
        const d = format(addDays(currentDate, dx < 0 ? 1 : -1), 'yyyy-MM-dd');
        dispatch({ type: 'ENSURE_DATE_COLUMN', payload: d });
      } catch {}
    } else {
      if (dx < 0) setTab('inbox'); else setTab('today');
    }
  };

  // Build current day column view directly from planner state
  const dayId = `date-${format(currentDate, 'yyyy-MM-dd')}`;
  const todayColumn: Column | undefined = state.columns.find((c: any) => c.id === dayId);
  const todayTasks: Task[] = state.tasks
    .filter((t: any) => t.columnId === dayId)
    .sort((a: any, b: any) => (a.position || 0) - (b.position || 0));

  return (
    <div className="fixed inset-0 flex flex-col bg-white dark:bg-gray-900" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* Minimal top bar */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-gray-200 dark:border-gray-800 backdrop-blur bg-white/70 dark:bg-gray-900/70" style={{ WebkitBackdropFilter: 'blur(8px)' }}>
        <div className="flex items-center gap-2">
          <button aria-label="Menü" onClick={() => setMenuOpen(true)} className="w-9 h-9 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300">
            <Menu className="w-5 h-5" />
          </button>
          <div className="text-base font-semibold text-gray-900 dark:text-white">
          {tab === 'today' ? 'Heute' : 'Inbox'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button aria-label="Upload" onClick={handleUpload} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: accent }}>
            <Upload className="w-5 h-5 text-white" />
          </button>
          <button aria-label="Download" onClick={handleDownload} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: accent }}>
            <Download className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full w-full">
          {tab === 'today' ? (
            <div className="p-3">
              {todayColumn ? (
                <TaskColumn column={todayColumn as any} tasks={todayTasks as any} />
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400 p-4">Keine Heutespalte gefunden.</div>
              )}
            </div>
          ) : (
            <InboxView />
          )}
        </div>
      </div>

      {/* Floating Quick Add */}
      <button
        aria-label="Schnell hinzufügen"
        onClick={() => setShowQuickAdd(true)}
        className="fixed bottom-20 right-5 w-14 h-14 rounded-full shadow-xl flex items-center justify-center"
        style={{ backgroundColor: accent }}
      >
        <Plus className="w-6 h-6 text-white" />
      </button>

      {/* Bottom tab bar */}
      <div className="h-16 border-t border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur flex">
        <button className="flex-1 flex flex-col items-center justify-center" onClick={() => setTab('today')}>
          <CalendarDays className="w-5 h-5" style={{ color: tab==='today'?accent:'#9ca3af' }} />
          <span className="text-xs" style={{ color: tab==='today'?accent:'#6b7280' }}>Heute</span>
        </button>
        <button className="flex-1 flex flex-col items-center justify-center" onClick={() => setTab('inbox')}>
          <Inbox className="w-5 h-5" style={{ color: tab==='inbox'?accent:'#9ca3af' }} />
          <span className="text-xs" style={{ color: tab==='inbox'?accent:'#6b7280' }}>Inbox</span>
        </button>
      </div>

      {/* Smart Task Modal for quick add */}
      {showQuickAdd && (
        <SmartTaskModal
          isOpen={showQuickAdd}
          onClose={() => setShowQuickAdd(false)}
          targetColumn={tab === 'today' ? { id: `date-${format(new Date(), 'yyyy-MM-dd')}`, title: 'Heute' } as any : undefined}
          placeholder={tab === 'today' ? 'Aufgabe für heute…' : 'Aufgabe in Inbox…'}
        />
      )}

      <MobileSnackbar open={snackbarOpen} onClose={() => setSnackbarOpen(false)} message={snackbarMsg} />

      {/* Fullscreen Sidebar (Things-like) */}
      {menuOpen && (
        <div className="fixed inset-0 z-[100000]" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMenuOpen(false)} />
          <div
            className="absolute inset-y-0 left-0 w-full max-w-sm bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col"
            onTouchStart={(e) => { e.stopPropagation(); menuTouchStartX.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              if (menuTouchStartX.current == null) return;
              const dx = e.changedTouches[0].clientX - menuTouchStartX.current;
              menuTouchStartX.current = null;
              if (dx < -40) setMenuOpen(false);
            }}
          >
            <div className="px-5 pt-6 pb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">TaskFuchs</h2>
            </div>
            <nav className="flex-1 px-2 space-y-1">
              <button onClick={() => { setTab('inbox'); setMenuOpen(false); }} className="w-full text-left px-4 py-3 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800">
                Inbox
              </button>
              <button onClick={() => { setTab('today'); setCurrentDate(new Date()); setMenuOpen(false); }} className="w-full text-left px-4 py-3 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800">
                Heute
              </button>
              <button onClick={() => { setTab('today'); setCurrentDate(addDays(new Date(), 1)); setMenuOpen(false); }} className="w-full text-left px-4 py-3 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800">
                Geplant
              </button>
            </nav>
            <div className="px-4 pb-6 pt-2 flex justify-center">
              <button onClick={() => { try { window.dispatchEvent(new CustomEvent('navigate-to-settings')); } catch {} setMenuOpen(false); }} className="px-5 py-2 rounded-full text-white" style={{ backgroundColor: accent }}>
                Einstellungen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


