import React, { memo, useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  X, 
  Mail, 
  ChevronDown, 
  RefreshCw, 
  Search, 
  Inbox, 
  Send, 
  Archive, 
  Trash2,
  AlertCircle,
  Loader2,
  Settings,
  Check
} from 'lucide-react';
import { useEmail } from '../../context/EmailContext';
import { EmailItem } from './EmailItem';
import type { EmailFolder, EmailToTaskAction } from '../../types/email';

// Folder icon mapping
const getFolderIcon = (folderName: string) => {
  const name = folderName.toLowerCase();
  if (name.includes('inbox')) return Inbox;
  if (name.includes('sent') || name.includes('gesendet')) return Send;
  if (name.includes('archive') || name.includes('archiv')) return Archive;
  if (name.includes('trash') || name.includes('deleted') || name.includes('papierkorb')) return Trash2;
  return Mail;
};

export const EmailSidebar = memo(function EmailSidebar() {
  const { t } = useTranslation();
  const { 
    state, 
    closeSidebar, 
    fetchMessages, 
    selectFolder, 
    markAsRead, 
    archiveMessage, 
    deleteMessage,
    setSearchQuery,
    refresh,
    setEmailToTaskAction
  } = useEmail();
  
  const [showFolderDropdown, setShowFolderDropdown] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Close settings dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Email-to-task action options
  const emailToTaskActions: { value: EmailToTaskAction; label: string }[] = [
    { value: 'none', label: t('email.actionNone', 'Do nothing') },
    { value: 'mark_read', label: t('email.actionMarkRead', 'Mark as read') },
    { value: 'archive', label: t('email.actionArchive', 'Archive') },
    { value: 'archive_and_read', label: t('email.actionArchiveAndRead', 'Archive & mark read') }
  ];
  const [localSearch, setLocalSearch] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const listRef = useRef<HTMLDivElement>(null);

  // Debounced search
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalSearch(value);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(value);
    }, 300);
  }, [setSearchQuery]);

  // Clear search on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Load more on scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 100 && state.hasMore && !state.isLoading) {
      fetchMessages(undefined, true);
    }
  }, [fetchMessages, state.hasMore, state.isLoading]);

  // Get selected folder info
  const selectedFolder = state.folders.find(f => f.id === state.selectedFolderId) || {
    displayName: t('email.inbox', 'Inbox'),
    unreadItemCount: 0
  } as EmailFolder;

  if (!state.isOpen) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-[350px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-xl z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span className="font-semibold text-gray-900 dark:text-white">
            {t('email.title', 'Email')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Settings dropdown */}
          <div ref={settingsRef} className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 ${showSettings ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
              title={t('email.settings', 'Email settings')}
            >
              <Settings className="w-5 h-5" />
            </button>
            
            {showSettings && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {t('email.onAddAsTask', 'When adding as task')}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {t('email.onAddAsTaskDesc', 'Action to perform on the email')}
                  </p>
                </div>
                <div className="p-1">
                  {emailToTaskActions.map((action) => (
                    <button
                      key={action.value}
                      onClick={() => {
                        setEmailToTaskAction(action.value);
                        setShowSettings(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors ${
                        state.emailToTaskAction === action.value 
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span>{action.label}</span>
                      {state.emailToTaskAction === action.value && (
                        <Check className="w-4 h-4" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={closeSidebar}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Folder selector */}
      <div className="p-3 border-b border-gray-100 dark:border-gray-800">
        <div className="relative">
          <button
            onClick={() => setShowFolderDropdown(!showFolderDropdown)}
            className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center gap-2">
              {React.createElement(getFolderIcon(selectedFolder.displayName), { 
                className: 'w-4 h-4 text-gray-600 dark:text-gray-400' 
              })}
              <span className="font-medium text-gray-900 dark:text-white">
                {selectedFolder.displayName}
              </span>
              {selectedFolder.unreadItemCount > 0 && (
                <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full">
                  {selectedFolder.unreadItemCount}
                </span>
              )}
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showFolderDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* Folder dropdown */}
          {showFolderDropdown && state.folders.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-64 overflow-y-auto z-10">
              {state.folders.map((folder) => {
                const FolderIcon = getFolderIcon(folder.displayName);
                return (
                  <button
                    key={folder.id}
                    onClick={() => {
                      selectFolder(folder.id);
                      setShowFolderDropdown(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      folder.id === state.selectedFolderId ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FolderIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{folder.displayName}</span>
                    </div>
                    {folder.unreadItemCount > 0 && (
                      <span className="text-xs text-gray-500">{folder.unreadItemCount}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Search and refresh */}
      <div className="p-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={localSearch}
            onChange={handleSearchChange}
            placeholder={t('email.search', 'Search emails...')}
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 rounded-lg border-0 focus:ring-2 focus:ring-blue-500 dark:text-white placeholder-gray-400"
          />
        </div>
        <button
          onClick={() => refresh()}
          disabled={state.isLoading}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 disabled:opacity-50"
          title={t('email.refresh', 'Refresh')}
        >
          <RefreshCw className={`w-4 h-4 ${state.isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Error state */}
      {state.error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-800">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{state.error}</span>
          </div>
        </div>
      )}

      {/* Email list */}
      <div 
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {state.isLoading && state.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <span className="text-sm">{t('email.loading', 'Loading emails...')}</span>
          </div>
        ) : state.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-500">
            <Inbox className="w-12 h-12 mb-2 opacity-50" />
            <span className="text-sm">{t('email.noEmails', 'No emails found')}</span>
          </div>
        ) : (
          <>
            {state.messages.map((email) => (
              <EmailItem
                key={email.id}
                email={email}
                onMarkAsRead={markAsRead}
                onArchive={archiveMessage}
                onDelete={deleteMessage}
              />
            ))}
            {state.isLoading && state.messages.length > 0 && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            )}
          </>
        )}
      </div>

      {/* Hint footer */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          {t('email.dragHint', 'Click the action buttons to add emails as tasks')}
        </p>
      </div>
    </div>
  );
});

export default EmailSidebar;

