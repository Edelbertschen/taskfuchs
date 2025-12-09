import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  X, 
  ExternalLink, 
  User, 
  Clock, 
  Mail as MailIcon,
  Paperclip,
  Loader2,
  Download,
  FileText,
  Image,
  File,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { OutlookEmail } from '../../types/email';
import { useApp } from '../../context/AppContext';
import { useEmail, type EmailAttachment } from '../../context/EmailContext';
import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';

interface EmailPreviewModalProps {
  email: OutlookEmail;
  onClose: () => void;
}

export function EmailPreviewModal({ email, onClose }: EmailPreviewModalProps) {
  const { t, i18n } = useTranslation();
  const { state: appState } = useApp();
  const { fetchMessageBody, fetchAttachments, downloadAttachment } = useEmail();
  const accentColor = appState.preferences.accentColor || '#0ea5e9';
  const [isLoading, setIsLoading] = useState(false);
  const [bodyContent, setBodyContent] = useState<string | null>(null);
  const [bodyContentType, setBodyContentType] = useState<'text' | 'html'>('text');
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
  const [showAttachments, setShowAttachments] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

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

  // Fetch attachments if email has them
  useEffect(() => {
    const loadAttachments = async () => {
      if (!email.hasAttachments) return;
      
      setIsLoadingAttachments(true);
      try {
        const atts = await fetchAttachments(email.id);
        setAttachments(atts);
      } catch (error) {
        console.error('Failed to load attachments:', error);
      } finally {
        setIsLoadingAttachments(false);
      }
    };

    loadAttachments();
  }, [email.id, email.hasAttachments, fetchAttachments]);

  // Handle attachment download
  const handleDownload = async (attachment: EmailAttachment) => {
    setDownloadingId(attachment.id);
    try {
      let contentBytes = attachment.contentBytes;
      
      // If no content, fetch it
      if (!contentBytes) {
        const fullAttachment = await downloadAttachment(email.id, attachment.id);
        contentBytes = fullAttachment?.contentBytes;
      }
      
      if (contentBytes) {
        // Decode base64 and create blob
        const byteCharacters = atob(contentBytes);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: attachment.contentType });
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = attachment.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to download attachment:', error);
    } finally {
      setDownloadingId(null);
    }
  };

  // Get icon for attachment type
  const getAttachmentIcon = (contentType: string) => {
    if (contentType.startsWith('image/')) return Image;
    if (contentType.includes('pdf') || contentType.includes('document')) return FileText;
    return File;
  };

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

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
        <div className="email-wrapper rounded-lg p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div 
            className="prose prose-sm dark:prose-invert max-w-none email-content"
            dangerouslySetInnerHTML={{ __html: bodyContent }}
          />
        </div>
      );
    }

    // Plain text - preserve formatting
    return (
      <div className="email-wrapper rounded-lg p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
          {bodyContent}
        </pre>
      </div>
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

            {/* Attachments section */}
            {email.hasAttachments && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowAttachments(!showAttachments)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors w-full"
                >
                  <Paperclip className="w-4 h-4 flex-shrink-0" style={{ color: accentColor }} />
                  <span>{t('email.attachments', 'Attachments')}</span>
                  {attachments.length > 0 && (
                    <span 
                      className="px-1.5 py-0.5 text-xs font-medium rounded-full"
                      style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                    >
                      {attachments.length}
                    </span>
                  )}
                  <span className="ml-auto">
                    {showAttachments ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </span>
                </button>
                
                {showAttachments && (
                  <div className="mt-2 space-y-1">
                    {isLoadingAttachments ? (
                      <div className="flex items-center gap-2 py-2 text-sm text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{t('email.loadingAttachments', 'Loading attachments...')}</span>
                      </div>
                    ) : attachments.length === 0 ? (
                      <div className="py-2 text-sm text-gray-500 dark:text-gray-400 italic">
                        {t('email.noAttachmentsFound', 'No attachments found')}
                      </div>
                    ) : (
                      attachments.filter(att => !att.isInline).map((attachment) => {
                        const Icon = getAttachmentIcon(attachment.contentType);
                        const isDownloading = downloadingId === attachment.id;
                        
                        return (
                          <div
                            key={attachment.id}
                            className="flex items-center gap-3 p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors group"
                          >
                            <div 
                              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: `${accentColor}15` }}
                            >
                              <Icon className="w-4 h-4" style={{ color: accentColor }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {attachment.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {formatSize(attachment.size)}
                              </p>
                            </div>
                            <button
                              onClick={() => handleDownload(attachment)}
                              disabled={isDownloading}
                              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                              title={t('email.download', 'Download')}
                            >
                              {isDownloading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Download className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Email body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {renderBody()}
        </div>

        {/* Style injection for email HTML - ensures readability in both modes */}
        <style>{`
          /* Base email content styling */
          .email-content {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            line-height: 1.6;
          }
          
          /* Force text colors for readability */
          .email-content,
          .email-content p,
          .email-content div,
          .email-content span,
          .email-content td,
          .email-content th,
          .email-content li {
            color: #1f2937 !important;
          }
          
          .dark .email-content,
          .dark .email-content p,
          .dark .email-content div,
          .dark .email-content span,
          .dark .email-content td,
          .dark .email-content th,
          .dark .email-content li {
            color: #e5e7eb !important;
          }
          
          /* Override background colors that might interfere */
          .email-content table,
          .email-content tr,
          .email-content td,
          .email-content th,
          .email-content div {
            background-color: transparent !important;
          }
          
          /* Images */
          .email-content img {
            max-width: 100%;
            height: auto;
            border-radius: 4px;
          }
          
          /* Tables */
          .email-content table {
            border-collapse: collapse;
            width: auto;
            max-width: 100%;
          }
          
          .email-content td,
          .email-content th {
            padding: 4px 8px;
          }
          
          /* Links */
          .email-content a {
            color: ${accentColor} !important;
            text-decoration: underline;
          }
          
          /* Blockquotes */
          .email-content blockquote {
            border-left: 3px solid #d1d5db;
            padding-left: 1rem;
            margin-left: 0;
            margin-right: 0;
            color: #6b7280 !important;
          }
          
          .dark .email-content blockquote {
            border-left-color: #4b5563;
            color: #9ca3af !important;
          }
          
          /* Headings */
          .email-content h1,
          .email-content h2,
          .email-content h3,
          .email-content h4 {
            color: #111827 !important;
            margin-top: 1em;
            margin-bottom: 0.5em;
          }
          
          .dark .email-content h1,
          .dark .email-content h2,
          .dark .email-content h3,
          .dark .email-content h4 {
            color: #f3f4f6 !important;
          }
          
          /* Lists */
          .email-content ul,
          .email-content ol {
            padding-left: 1.5rem;
            margin: 0.5em 0;
          }
          
          /* Horizontal rules */
          .email-content hr {
            border: none;
            border-top: 1px solid #e5e7eb;
            margin: 1em 0;
          }
          
          .dark .email-content hr {
            border-top-color: #374151;
          }
          
          /* Pre/code blocks */
          .email-content pre,
          .email-content code {
            background-color: #f3f4f6 !important;
            color: #1f2937 !important;
            padding: 2px 4px;
            border-radius: 4px;
            font-size: 13px;
          }
          
          .dark .email-content pre,
          .dark .email-content code {
            background-color: #1f2937 !important;
            color: #e5e7eb !important;
          }
        `}</style>
      </div>
    </div>
  );
}

export default EmailPreviewModal;

