import React, { useState, useEffect } from 'react';
import { X, Cloud, KeyRound, Folder, Lock, Save, Link as LinkIcon } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface MobileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSettingsModal({ isOpen, onClose }: MobileSettingsModalProps) {
  const { state, dispatch } = useApp();

  const accent = state.preferences.accentColor;

  const [enabled, setEnabled] = useState<boolean>(!!state.preferences.dropbox?.enabled);
  const [appKey, setAppKey] = useState<string>(state.preferences.dropbox?.appKey || '');
  const [folderPath, setFolderPath] = useState<string>(state.preferences.dropbox?.folderPath || '/Apps/TaskFuchs');
  const [passphrase, setPassphrase] = useState<string>('');
  const [rememberPassphrase, setRememberPassphrase] = useState<boolean>(!!state.preferences.dropbox?.rememberPassphrase);
  const [connecting, setConnecting] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    try {
      if (rememberPassphrase) {
        const stored = localStorage.getItem('taskfuchs_dropbox_passphrase');
        if (stored) setPassphrase(stored);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const persistPrefs = () => {
    const prev = state.preferences.dropbox || ({} as any);
    dispatch({
      type: 'UPDATE_PREFERENCES',
      payload: {
        dropbox: {
          enabled,
          appKey,
          accessToken: prev.accessToken,
          refreshToken: prev.refreshToken,
          expiresAt: prev.expiresAt,
          accountEmail: prev.accountEmail,
          accountName: prev.accountName,
          folderPath: folderPath || '/Apps/TaskFuchs',
          autoSync: prev.autoSync ?? true,
          syncInterval: prev.syncInterval ?? 30,
          lastSync: prev.lastSync,
          lastSyncStatus: prev.lastSyncStatus,
          lastSyncError: prev.lastSyncError,
          conflictResolution: prev.conflictResolution || 'manual',
          rememberPassphrase,
          passphraseHint: prev.passphraseHint || ''
        }
      }
    });

    try {
      if (rememberPassphrase && passphrase) {
        localStorage.setItem('taskfuchs_dropbox_passphrase', passphrase);
      } else {
        localStorage.removeItem('taskfuchs_dropbox_passphrase');
      }
    } catch {}
  };

  const handleSave = () => {
    persistPrefs();
    setMessage('Gespeichert');
    setTimeout(() => setMessage(''), 1500);
  };

  const handleConnect = async () => {
    if (!enabled) {
      setMessage('Dropbox deaktiviert');
      return;
    }
    if (!appKey) {
      setMessage('App‑Key fehlt');
      return;
    }
    setConnecting(true);
    setMessage('Verbinde…');
    try {
      const redirectUri = `${window.location.origin}/auth/dropbox.html`;
      const { DropboxClient } = await import('../../utils/dropboxClient');
      const client = new DropboxClient(appKey, redirectUri);
      // Persist before redirect
      persistPrefs();
      await client.startAuth(); // will redirect
    } catch (e: any) {
      setMessage(e?.message || 'Verbindung fehlgeschlagen');
      setConnecting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100001]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 left-0 sm:left-auto sm:w-[28rem] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5" style={{ color: accent }} />
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Einstellungen</h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Dropbox Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Dropbox Sync (E2EE)</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">Sichere Synchronisation über Dropbox. Daten werden lokal verschlüsselt.</p>

            <div className="space-y-4">
              {/* Enable */}
              <label className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-800">
                <span className="text-sm text-gray-900 dark:text-gray-100">Dropbox aktivieren</span>
                <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
              </label>

              {/* App Key */}
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2 mb-1">
                  <KeyRound className="w-4 h-4" /> App‑Key
                </label>
                <input
                  value={appKey}
                  onChange={(e) => setAppKey(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                  placeholder="z. B. a1b2c3…"
                />
                <a className="inline-flex items-center gap-1 text-xs mt-1 underline" href="https://www.dropbox.com/developers/apps" target="_blank" rel="noreferrer">
                  <LinkIcon className="w-3 h-3" /> Dropbox Apps
                </a>
              </div>

              {/* Folder */}
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2 mb-1">
                  <Folder className="w-4 h-4" /> Zielordner
                </label>
                <input
                  value={folderPath}
                  onChange={(e) => setFolderPath(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                  placeholder="/Apps/TaskFuchs"
                />
              </div>

              {/* Passphrase */}
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2 mb-1">
                  <Lock className="w-4 h-4" /> Passphrase (Verschlüsselung)
                </label>
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                  placeholder="Geheimes Passwort"
                />
                <label className="mt-2 inline-flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={rememberPassphrase} onChange={(e) => setRememberPassphrase(e.target.checked)} />
                  Passphrase merken (lokal)
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={handleSave}
                  className="px-4 py-2 rounded-lg text-white text-sm inline-flex items-center gap-2"
                  style={{ backgroundColor: accent }}
                >
                  <Save className="w-4 h-4" /> Speichern
                </button>
                <button
                  onClick={handleConnect}
                  disabled={!enabled || !appKey || connecting}
                  className="px-4 py-2 rounded-lg text-white text-sm inline-flex items-center gap-2 disabled:opacity-60"
                  style={{ backgroundColor: accent }}
                >
                  <Cloud className="w-4 h-4" /> {connecting ? 'Verbinde…' : 'Mit Dropbox verbinden'}
                </button>
              </div>

              {message && (
                <div className="text-xs text-gray-600 dark:text-gray-300">{message}</div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Schließen</button>
        </div>
      </div>
    </div>
  );
}


