import React, { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ExternalLink, 
  Archive, 
  Trash2, 
  Mail, 
  MailOpen,
  Paperclip,
  AlertCircle,
  CalendarPlus,
  Inbox
} from 'lucide-react';
import type { OutlookEmail } from '../../types/email';
import { getEmailSenderDisplay, formatEmailTime, createTaskFromEmail } from '../../utils/emailToTask';
import { useApp } from '../../context/AppContext';
import { useEmail } from '../../context/EmailContext';
import { format } from 'date-fns';

// Data transfer type for HTML5 native drag-and-drop
export const EMAIL_DRAG_TYPE = 'application/email';

interface EmailItemProps {
  email: OutlookEmail;
  onMarkAsRead: (messageId: string, isRead: boolean) => Promise<void>;
  onArchive: (messageId: string) => Promise<void>;
  onDelete: (messageId: string) => Promise<void>;
}

export const EmailItem = memo(function EmailItem({
  email,
  onMarkAsRead,
  onArchive,
  onDelete
}: EmailItemProps) {
  const { t } = useTranslation();
  const { state, dispatch } = useApp();
  const { performEmailToTaskAction } = useEmail();
  const [isHovered, setIsHovered] = useState(false);
  const [isActioning, setIsActioning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // HTML5 native drag handlers for cross-context drag-and-drop
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/email', JSON.stringify(email));
    e.dataTransfer.effectAllowed = 'copy';
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleOpenInOutlook = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(email.webLink, '_blank');
  };

  // Add email as task to Today
  const handleAddToToday = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isActioning) return;
    setIsActioning(true);
    
    try {
      const todayDate = format(new Date(), 'yyyy-MM-dd');
      const todayColumn = state.columns.find(col => col.type === 'date' && col.date === todayDate);
      
      const task = createTaskFromEmail(email, todayColumn);
      // Override columnId and dueDate for today
      task.columnId = todayColumn?.id || 'inbox';
      task.dueDate = todayDate;
      
      dispatch({
        type: 'ADD_TASK',
        payload: task
      });

      // Perform configured action on the email (mark read, archive, etc.)
      await performEmailToTaskAction(email.id);

      // Show success notification
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          id: `email-task-${Date.now()}`,
          title: t('email.taskCreated', 'Task created'),
          message: t('email.taskCreatedFromEmail', 'Task created from email: {{title}}', { title: email.subject }),
          timestamp: new Date().toISOString(),
          type: 'success' as const,
          read: false
        }
      });
    } catch (error) {
      console.error('Failed to create task from email:', error);
    } finally {
      setIsActioning(false);
    }
  };

  // Add email as task to Inbox (no date)
  const handleAddToInbox = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isActioning) return;
    setIsActioning(true);
    
    try {
      const task = createTaskFromEmail(email);
      // Override for inbox - no date column
      task.columnId = 'inbox';
      task.dueDate = undefined;
      
      dispatch({
        type: 'ADD_TASK',
        payload: task
      });

      // Perform configured action on the email (mark read, archive, etc.)
      await performEmailToTaskAction(email.id);

      // Show success notification
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          id: `email-task-${Date.now()}`,
          title: t('email.taskCreated', 'Task created'),
          message: t('email.taskCreatedInInbox', 'Task added to inbox: {{title}}', { title: email.subject }),
          timestamp: new Date().toISOString(),
          type: 'success' as const,
          read: false
        }
      });
    } catch (error) {
      console.error('Failed to create task from email:', error);
    } finally {
      setIsActioning(false);
    }
  };

  const handleMarkAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isActioning) return;
    setIsActioning(true);
    try {
      await onMarkAsRead(email.id, !email.isRead);
    } finally {
      setIsActioning(false);
    }
  };

  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isActioning) return;
    setIsActioning(true);
    try {
      await onArchive(email.id);
    } finally {
      setIsActioning(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isActioning) return;
    setIsActioning(true);
    try {
      await onDelete(email.id);
    } finally {
      setIsActioning(false);
    }
  };

  const senderName = getEmailSenderDisplay(email);
  const timeDisplay = formatEmailTime(email.receivedDateTime);

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        group relative p-3 border-b border-gray-100 dark:border-gray-800 
        transition-all duration-150 cursor-grab
        ${isDragging ? 'opacity-50 cursor-grabbing' : ''}
        ${!email.isRead ? 'bg-blue-50/50 dark:bg-blue-950/20' : 'bg-white dark:bg-gray-900'}
        hover:bg-gray-50 dark:hover:bg-gray-800/50
      `}
    >
      {/* Unread indicator */}
      {!email.isRead && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r" />
      )}

      {/* Main content */}
      <div className="flex flex-col gap-1">
        {/* Header: Sender + Time */}
        <div className="flex items-center justify-between">
          <span className={`text-sm ${!email.isRead ? 'font-semibold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
            {senderName}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-2">
            {timeDisplay}
          </span>
        </div>

        {/* Subject */}
        <div className="flex items-center gap-1">
          {email.importance === 'high' && (
            <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
          )}
          <span 
            className={`text-sm truncate ${!email.isRead ? 'font-medium text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}
            title={email.subject}
          >
            {email.subject || t('email.noSubject', '(No Subject)')}
          </span>
          {email.hasAttachments && (
            <Paperclip className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 ml-1" />
          )}
        </div>

        {/* Preview */}
        <p className="text-xs text-gray-500 dark:text-gray-500 line-clamp-2">
          {email.bodyPreview}
        </p>
      </div>

      {/* Hover actions */}
      {isHovered && (
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-1">
          {/* Add to Today */}
          <button
            onClick={handleAddToToday}
            disabled={isActioning}
            className="p-1.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-gray-600 dark:text-gray-400 hover:text-blue-600 disabled:opacity-50"
            title={t('email.addToToday', 'Add to Today')}
          >
            <CalendarPlus className="w-4 h-4" />
          </button>
          {/* Add to Inbox */}
          <button
            onClick={handleAddToInbox}
            disabled={isActioning}
            className="p-1.5 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-gray-600 dark:text-gray-400 hover:text-green-600 disabled:opacity-50"
            title={t('email.addToInbox', 'Add to Inbox')}
          >
            <Inbox className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-gray-200 dark:bg-gray-700" />
          <button
            onClick={handleOpenInOutlook}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
            title={t('email.openInOutlook', 'Open in Outlook')}
          >
            <ExternalLink className="w-4 h-4" />
          </button>
          <button
            onClick={handleMarkAsRead}
            disabled={isActioning}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-50"
            title={email.isRead ? t('email.markUnread', 'Mark as unread') : t('email.markRead', 'Mark as read')}
          >
            {email.isRead ? <Mail className="w-4 h-4" /> : <MailOpen className="w-4 h-4" />}
          </button>
          <button
            onClick={handleArchive}
            disabled={isActioning}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-50"
            title={t('email.archive', 'Archive')}
          >
            <Archive className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            disabled={isActioning}
            className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-600 dark:text-gray-400 hover:text-red-600 disabled:opacity-50"
            title={t('email.delete', 'Delete')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
});

export default EmailItem;
