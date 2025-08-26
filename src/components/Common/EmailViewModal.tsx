import React, { useState } from 'react';
import { X, Archive, Edit3, Save, User, Clock, Mail } from 'lucide-react';
import { Note } from '../../types';
import { HtmlRenderer } from './HtmlRenderer';
import { MarkdownRenderer } from './MarkdownRenderer';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useApp } from '../../context/AppContext';

interface EmailViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: Note;
}

export function EmailViewModal({ isOpen, onClose, email }: EmailViewModalProps) {
  const { state, dispatch } = useApp();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(email?.title || '');
  
  console.log('📧 EmailViewModal render:', { isOpen, hasEmail: !!email, emailId: email?.id });
  
  if (!isOpen || !email) return null;

  const handleStartEditTitle = () => {
    setEditedTitle(email?.title || '');
    setIsEditingTitle(true);
  };

  const handleSaveTitle = () => {
    const updatedEmail = {
      ...email,
      title: editedTitle,
      updatedAt: new Date().toISOString()
    };
    dispatch({ type: 'UPDATE_NOTE', payload: updatedEmail });
    setIsEditingTitle(false);
  };

  const handleCancelEditTitle = () => {
    setIsEditingTitle(false);
    setEditedTitle(email?.title || '');
  };

  const handleArchive = () => {
    if (!email) return;
    
    const updatedEmail = {
      ...email,
      archived: !email.archived,
      updatedAt: new Date().toISOString()
    };
    dispatch({ type: 'UPDATE_NOTE', payload: updatedEmail });
    onClose();
  };

  const metadata = email?.metadata?.emailMetadata;
  const subject = metadata?.originalSubject || email?.title?.replace('📧 ', '') || '';
  const from = metadata?.from;
  const date = metadata?.date ? format(new Date(metadata.date), 'dd.MM.yyyy HH:mm', { locale: de }) : '';

  // Get accent color for styling
  const getAccentColorStyles = () => {
    const accentColor = state.preferences.accentColor || '#2563eb';
    return {
      text: { color: accentColor },
      border: { borderColor: accentColor },
      bgLight: { backgroundColor: `${accentColor}10` },
      bg: { backgroundColor: accentColor }
    };
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg" style={getAccentColorStyles().bgLight}>
              <Mail className="w-5 h-5" style={getAccentColorStyles().text} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                E-Mail Ansicht
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                ID: {email.id}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleArchive}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              title={email.archived ? 'Aus Archiv wiederherstellen' : 'Archivieren'}
            >
              <Archive className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="px-8 py-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Title Section */}
          <div className="mb-6">
            {isEditingTitle ? (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="flex-1 text-xl font-bold bg-transparent border-2 rounded-lg px-3 py-2 focus:outline-none focus:ring-2"
                  style={{
                    borderColor: getAccentColorStyles().border.borderColor
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') handleCancelEditTitle();
                  }}
                  autoFocus
                />
                <button
                  onClick={handleSaveTitle}
                  className="p-2 text-green-600 hover:text-green-800 transition-colors"
                  title="Speichern"
                >
                  <Save className="w-5 h-5" />
                </button>
                <button
                  onClick={handleCancelEditTitle}
                  className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                  title="Abbrechen"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="group flex items-start justify-between">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white flex-1 mr-4">
                  {email.title}
                </h1>
                <button
                  onClick={handleStartEditTitle}
                  className="p-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all duration-200"
                  title="Titel bearbeiten"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Email Metadata */}
          {metadata && (
            <div className="mb-6 space-y-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              {from && (
                <div className="flex items-center space-x-3">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Von:</strong> {from.name ? `${from.name} <${from.email}>` : from.email}
                  </span>
                </div>
              )}
              {date && (
                <div className="flex items-center space-x-3">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Datum:</strong> {date}
                  </span>
                </div>
              )}
              {metadata.originalSubject && (
                <div className="flex items-center space-x-3">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Betreff:</strong> {metadata.originalSubject}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          {email.tags && email.tags.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {email.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Email Content */}
          <div className="flex justify-center">
            <div className="prose prose-gray dark:prose-invert max-w-2xl w-full">
              {email.metadata?.contentType === 'html' ? (
                <HtmlRenderer content={email.content} />
              ) : (
                <MarkdownRenderer content={email.content} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 