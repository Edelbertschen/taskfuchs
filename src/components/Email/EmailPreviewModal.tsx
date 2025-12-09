import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  X, 
  ExternalLink, 
  User, 
  Clock, 
  Mail as MailIcon,
  Paperclip,
  Loader2
} from 'lucide-react';
import type { OutlookEmail } from '../../types/email';
import { useApp } from '../../context/AppContext';
import { useEmail } from '../../context/EmailContext';
import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';

interface EmailPreviewModalProps {
  email: OutlookEmail;
  onClose: () => void;
}

export function EmailPreviewModal({ email, onClose }: EmailPreviewModalProps) {
  const { t, i18n } = useTranslation();
  const { state: appState } = useApp();
  const { fetchMessageBody } = useEmail();
  const accentColor = appState.preferences.accentColor || '#0ea5e9';
  const [isLoading, setIsLoading] = useState(false);
  const [bodyContent, setBodyContent] = useState<string | null>(null);
  const [bodyContentType, setBodyContentType] = useState<'text' | 'html'>('text');

  // Fetch full email body when modal opens
  useEffect(() => {
    const loadBody = async () => {
      if (email.body?.content) {
        // Already have body
        setBodyContent(email.body.content);
        setBodyContentType(email.body.contentType);
        return;
      }

      setIsLoading(true);
      try {
        const fullEmail = await fetchMessageBody(email.id);
        if (fullEmail?.body) {
          setBodyContent(fullEmail.body.content);
          setBodyContentType(fullEmail.body.contentType);
        }
      } catch (error) {
        console.error('Failed to load email body:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBody();
  }, [email.id, email.body, fetchMessageBody]);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'EEEE, d. MMMM yyyy, HH:mm', { 
      locale: i18n.language === 'de' ? de : enUS 
    });
  };

  // Render HTML content safely (sanitized display)
  const renderBody = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      );
    }

    if (!bodyContent) {
      return (
        <div className="text-gray-500 dark:text-gray-400 italic py-8 text-center">
          {email.bodyPreview || t('email.noContent', 'No content available')}
        </div>
      );
    }

    if (bodyContentType === 'html') {
      return (
        <div 
          className="prose prose-sm dark:prose-invert max-w-none email-content"
          dangerouslySetInnerHTML={{ __html: bodyContent }}
        />
      );
    }

    // Plain text - preserve formatting
    return (
      <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 dark:text-gray-300">
        {bodyContent}
      </pre>
    );
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const senderName = email.from?.emailAddress?.name || email.from?.emailAddress?.address || 'Unknown';
  const senderEmail = email.from?.emailAddress?.address || '';

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${accentColor}15` }}
            >
              <MailIcon className="w-5 h-5" style={{ color: accentColor }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('email.preview', 'Email Preview')}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Open in Outlook */}
            <a
              href={email.webLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
              style={{ 
                backgroundColor: `${accentColor}15`,
                color: accentColor
              }}
            >
              <ExternalLink className="w-4 h-4" />
              {t('email.openInOutlook', 'Open in Outlook')}
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Email metadata */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
          {/* Subject */}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            {email.subject || t('email.noSubject', '(No Subject)')}
          </h3>
          
          <div className="space-y-2">
            {/* From */}
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-gray-600 dark:text-gray-400">{t('email.from', 'From')}:</span>
              <span className="text-gray-900 dark:text-white font-medium">{senderName}</span>
              {senderEmail && senderName !== senderEmail && (
                <span className="text-gray-500 dark:text-gray-500">&lt;{senderEmail}&gt;</span>
              )}
            </div>
            
            {/* Date */}
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-gray-600 dark:text-gray-400">{t('email.date', 'Date')}:</span>
              <span className="text-gray-900 dark:text-white">{formatDate(email.receivedDateTime)}</span>
            </div>

            {/* Attachments indicator */}
            {email.hasAttachments && (
              <div className="flex items-center gap-2 text-sm">
                <Paperclip className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-600 dark:text-gray-400">{t('email.hasAttachments', 'Has attachments')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Email body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {renderBody()}
        </div>

        {/* Footer with style injection for email HTML */}
        <style>{`
          .email-content {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          .email-content img {
            max-width: 100%;
            height: auto;
          }
          .email-content table {
            border-collapse: collapse;
            width: auto;
          }
          .email-content a {
            color: ${accentColor};
            text-decoration: underline;
          }
          .email-content blockquote {
            border-left: 3px solid #e5e7eb;
            padding-left: 1rem;
            margin-left: 0;
            color: #6b7280;
          }
          .dark .email-content blockquote {
            border-left-color: #374151;
            color: #9ca3af;
          }
        `}</style>
      </div>
    </div>
  );
}

export default EmailPreviewModal;

