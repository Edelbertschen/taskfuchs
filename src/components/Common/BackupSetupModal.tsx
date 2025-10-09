import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from 'react-i18next';

interface BackupSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChooseDirectory: () => Promise<void> | void;
}

export function BackupSetupModal({ isOpen, onClose, onChooseDirectory }: BackupSetupModalProps) {
  const { state, dispatch } = useApp();
  const { i18n, t } = useTranslation();
  const [dirName, setDirName] = React.useState<string | null>(null);
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
            {t('backup_modal.description', 'Um Datenverlust zu vermeiden, speichert TaskFuchs regelmäßig automatische Backups als JSON. Bitte wähle ein Verzeichnis für die Sicherungen aus.')}
          </p>
          {/* Enable + Interval */}
          <div className="flex items-center gap-3 mb-4">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!state.preferences.backup?.enabled}
                onChange={(e) => dispatch({ type: 'UPDATE_PREFERENCES', payload: { backup: { ...(state.preferences.backup||{ intervalMinutes: 60, notify: true }), enabled: e.target.checked } } })}
              />
              <span className="text-sm text-gray-800 dark:text-gray-200">{t('backup_modal.enable', 'Automatische Backups aktivieren')}</span>
            </label>
          </div>
          {dirName && (
            <div className="mb-4 flex items-center gap-2 text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-gray-600 dark:text-gray-300"><path d="M2 6a2 2 0 0 1 2-2h4.5a2 2 0 0 1 1.6.8l.9 1.2H20a2 2 0 0 1 2 2v8.5A2.5 2.5 0 0 1 19.5 19h-15A2.5 2.5 0 0 1 2 16.5V6z"/></svg>
              <span className="text-gray-700 dark:text-gray-200">{t('backup_modal.selected_dir', 'Ausgewählter Ordner')}:</span>
              <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 max-w-[60%] truncate" title={dirName}>{dirName}</span>
            </div>
          )}
          {/* Interval input */}
          <div className="flex items-center gap-3 mb-4">
            <label className="text-sm font-medium text-gray-800 dark:text-gray-200 w-44">
              {t('backup_modal.interval', 'Intervall (Minuten)')}
            </label>
            <input
              type="number"
              min={1}
              className="w-28 h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2"
              style={{ boxShadow: `0 0 0 1px rgba(0,0,0,0.02)`, WebkitTapHighlightColor: 'transparent' }}
              value={state.preferences.backup?.intervalMinutes ?? 60}
              onChange={(e) => {
                const val = Math.max(1, parseInt(e.target.value || '60'));
                dispatch({ type: 'UPDATE_PREFERENCES', payload: { backup: { enabled: state.preferences.backup?.enabled ?? false, intervalMinutes: val, notify: state.preferences.backup?.notify ?? true, lastSuccess: state.preferences.backup?.lastSuccess } } });
              }}
            />
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-300 mb-5">
            {t('backup_modal.hint', 'Du kannst Intervall und Ziel jederzeit unter Einstellungen → Daten → Backup ändern.')}
          </div>
          <div className="flex items-center gap-3">
            <img src="/3d_fox.png" alt="Fuchs" width={64} height={64} className="rounded-full" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.25))' }} />
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <div className="font-medium text-gray-900 dark:text-white">{t('backup_modal.tip_title', 'Tipp des Fuchses')}</div>
              {t('backup_modal.tip_text', 'Lege das Verzeichnis z. B. in deiner Cloud (Nextcloud/Dropbox/OneDrive) an, um zusätzliche Sicherheit zu haben.')}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2 bg-white dark:bg-gray-900">
          <button onClick={onClose} className="px-3.5 h-10 rounded-lg text-gray-800 dark:text-gray-100 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 shadow-sm">
            {t('backup_modal.cancel', 'Später')}
          </button>
          <button
            onClick={async () => { await onChooseDirectory(); /* keep modal open for explicit confirmation */ }}
            className="px-3.5 h-10 rounded-lg text-white shadow-sm hover:opacity-95"
            style={{ backgroundColor: state.preferences.accentColor, boxShadow: `${state.preferences.accentColor}33 0 4px 16px` }}
          >
            {t('backup_modal.choose', 'Verzeichnis wählen')}
          </button>
          <button
            onClick={() => onClose()}
            className="ml-2 px-3.5 h-10 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
          >OK</button>
        </div>
      </div>
    </div>,
    document.body
  );
}


