import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  EyeOff, 
  Edit3, 
  Columns, 
  Link as LinkIcon, 
  Tag as TagIcon, 
  Plus, 
  X, 
  Pin, 
  Archive,
  Search,
  Calendar,
  Clock,
  HelpCircle,
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Code,
  Quote,
  Minus,
  CheckSquare,
  Type,
  Settings,
  FileText,
  ExternalLink,
  Loader,
  Download,
  FileDown,
  Maximize,
  Minimize,
  Printer,
  FolderOpen,
  Mail,
  BookOpen
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAppTranslation } from '../../utils/i18nHelpers';
import { WysiwygEditor } from '../Common/WysiwygEditor';
import { TaskModal } from '../Tasks/TaskModal';
import type { Note, Task } from '../../types';
import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { exportAsTxt, exportAsMarkdown, exportAsPdf, printNote } from '../../utils/noteExporter';
import { MarkdownRenderer } from '../Common/MarkdownRenderer';
import { HtmlRenderer } from '../Common/HtmlRenderer';
import { NoteLinkModal } from './NoteLinkModal';
import { handleImagePaste, getImageMarkdownReference, resolveImageUrls } from '../../utils/imageStorage';

interface NoteEditorProps {
  onFullScreenToggle?: (isFullScreen: boolean) => void;
  emailViewModal?: { isOpen: boolean; email: Note | null };
  setEmailViewModal?: React.Dispatch<React.SetStateAction<{ isOpen: boolean; email: Note | null }>>;
}

export function NoteEditor({ onFullScreenToggle, emailViewModal, setEmailViewModal }: NoteEditorProps) {
  const { state, dispatch } = useApp();
  const { noteEditor, pins } = useAppTranslation();
  const { t, i18n } = useTranslation();
  const { selectedNote, editorMode, isEditing } = state.notes;
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [showTaskSearch, setShowTaskSearch] = useState(false);
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [showMarkdownHelp, setShowMarkdownHelp] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [linkedTaskIds, setLinkedTaskIds] = useState<string[]>([]);
  const [linkedProjectIds, setLinkedProjectIds] = useState<string[]>([]);
  const [linkedNoteIds, setLinkedNoteIds] = useState<string[]>([]);
  const [showProjectSearch, setShowProjectSearch] = useState(false);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [showNoteSearch, setShowNoteSearch] = useState(false);
  const [noteSearchQuery, setNoteSearchQuery] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Dynamic accent color styles
  const getAccentColorStyles = () => {
    const accentColor = state.preferences.accentColor;
    return {
      text: { color: accentColor },
      bg: { backgroundColor: accentColor },
      bgHover: { backgroundColor: accentColor + 'E6' },
      border: { borderColor: accentColor },
      ring: { '--tw-ring-color': accentColor },
      bgLight: { backgroundColor: accentColor + '1A' },
      bgSemiLight: { backgroundColor: accentColor + '60' },
      bgSemiDark: { backgroundColor: accentColor + 'CC' },
    };
  };

  const linkedTasks = state.tasks.filter(task => linkedTaskIds.includes(task.id));
  const linkedProjects = state.columns.filter(col => col.type === 'project' && linkedProjectIds.includes(col.id));
  const linkedNotes = state.notes.notes.filter(note => linkedNoteIds.includes(note.id));
  
  const availableTasks = state.tasks.filter(task => {
    if (linkedTaskIds.includes(task.id)) return false;
    if (taskSearchQuery.trim() === '') return true;
    const query = taskSearchQuery.toLowerCase();
    return task.title.toLowerCase().includes(query) || 
           (task.description?.toLowerCase() ?? '').includes(query);
  });

  const availableProjects = state.columns.filter(col => {
    if (col.type !== 'project') return false;
    if (linkedProjectIds.includes(col.id)) return false;
    if (projectSearchQuery.trim() === '') return true;
    const query = projectSearchQuery.toLowerCase();
    return col.title.toLowerCase().includes(query);
  });

  const [lastSelectedNoteId, setLastSelectedNoteId] = useState<string | null>(null);

  // Utility-Funktion für Auto-Focus (um Code-Duplikation zu vermeiden)
  const performAutoFocus = useCallback((context: string = '') => {
    console.log(`🎯 Performing auto-focus${context ? ` (${context})` : ''} for editor mode:`, editorMode);
    
    // Fokussiere je nach Editor-Modus
    if (editorMode === 'wysiwyg' || editorMode === 'split') {
      const selectors = [
        '.ql-editor',
        '[contenteditable="true"]',
        '.wysiwyg-editor [contenteditable]',
        '.editor-content [contenteditable]'
      ];
      
      let focused = false;
      for (const selector of selectors) {
        const wysiwygEditor = document.querySelector(selector) as HTMLElement;
        if (wysiwygEditor) {
          try {
            wysiwygEditor.focus();
            // Setze Cursor ans Ende des Contents
            if (wysiwygEditor.textContent) {
              const range = document.createRange();
              const selection = window.getSelection();
              range.selectNodeContents(wysiwygEditor);
              range.collapse(false);
              selection?.removeAllRanges();
              selection?.addRange(range);
            }
            console.log(`📝 Auto-focused WYSIWYG editor${context ? ` (${context})` : ''} with selector:`, selector);
            focused = true;
            break;
          } catch (error) {
            console.warn(`⚠️ Failed to focus with selector${context ? ` (${context})` : ''}:`, selector, error);
          }
        }
      }
      if (!focused) {
        console.warn(`⚠️ Could not find WYSIWYG editor to focus${context ? ` (${context})` : ''}`);
      }
    }
    
    if (editorMode === 'markdown' || editorMode === 'split') {
      if (textareaRef.current) {
        try {
          textareaRef.current.focus();
          const length = textareaRef.current.value.length;
          textareaRef.current.setSelectionRange(length, length);
          console.log(`📝 Auto-focused markdown editor${context ? ` (${context})` : ''}`);
        } catch (error) {
          console.warn(`⚠️ Failed to focus markdown editor${context ? ` (${context})` : ''}:`, error);
        }
      } else {
        console.warn(`⚠️ textareaRef.current is null${context ? ` (${context})` : ''}`);
      }
    }
  }, [editorMode]);

  useEffect(() => {
    if (selectedNote) {
      const isNewNote = selectedNote.id !== lastSelectedNoteId;
      
      setTitle(selectedNote.title);
      setContent(selectedNote.content);
      setTags([...selectedNote.tags]);
      setLinkedTaskIds([...selectedNote.linkedTasks]);
      setLinkedProjectIds([...(selectedNote.linkedProjects || [])]);
      setLinkedNoteIds([...(selectedNote.linkedNotes || [])]);
      setIsPinned(selectedNote.pinned);
      setHasUnsavedChanges(false);
      
      if (isNewNote) {
        setLastSelectedNoteId(selectedNote.id);
        
        // Prüfe ob es eine neue, leere Note ist
        const isEmptyNote = !selectedNote.title || (!selectedNote.title && !selectedNote.content);
        
        if (isEmptyNote) {
          // Neue, leere Note → Edit-Modus mit Titel-Fokus
          setIsEditingTitle(true);
          setIsPreviewMode(false);
          setTimeout(() => {
            titleInputRef.current?.focus();
          }, 100);
        } else {
          // Bestehende Note → standardmäßig Preview-Modus
          setIsEditingTitle(false);
          setIsPreviewMode(true);
        }
      }
    }
  }, [selectedNote, lastSelectedNoteId]);

  // Synchronisiere lokalen isPreviewMode mit globalem isEditing State
  useEffect(() => {
    if (isEditing !== undefined) {
      setIsPreviewMode(!isEditing);
      console.log('🔄 Synchronizing editor mode: isEditing =', isEditing, ', setting isPreviewMode =', !isEditing);
      
      // Auto-fokussiere den Editor wenn wir in Edit-Modus wechseln
      if (isEditing && selectedNote) {
        setTimeout(() => {
          performAutoFocus('syncing isEditing');
        }, 300); // Längeres Timing für bessere Zuverlässigkeit
      }
    }
  }, [isEditing, selectedNote, editorMode, performAutoFocus]);

  // Zusätzlicher Auto-Focus beim Verlassen des Preview-Modus
  useEffect(() => {
    if (!isPreviewMode && selectedNote) {
      console.log('🎯 Preview mode disabled, attempting auto-focus');
      setTimeout(() => {
        performAutoFocus('after preview mode change');
      }, 200); // Kürzeres Timing da Preview-Mode-Wechsel schneller ist
    }
  }, [isPreviewMode, selectedNote, editorMode, performAutoFocus]);

  const autoSave = useCallback(() => {
    if (selectedNote && hasUnsavedChanges) {
      const updatedNote: Note = {
        ...selectedNote,
        title: title.trim() || (i18n.language === 'en' ? 'Untitled Note' : 'Unbenannte Notiz'),
        content,
        tags,
        updatedAt: new Date().toISOString(),
      };

      dispatch({ type: 'UPDATE_NOTE', payload: updatedNote });
      setHasUnsavedChanges(false);
    }
  }, [selectedNote, title, content, tags, hasUnsavedChanges, dispatch]);

  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    if (hasUnsavedChanges) {
      autoSaveTimeoutRef.current = setTimeout(() => {
        autoSave();
      }, 2000);
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [hasUnsavedChanges, autoSave]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showExportMenu) {
        const target = event.target as HTMLElement;
        if (!target.closest('[data-export-menu]')) {
          setShowExportMenu(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportMenu]);

  if (!selectedNote) {
    return (
      <div className="w-full h-full flex items-center justify-center p-8">
        <div className={`flex flex-col items-center justify-center text-center p-8 rounded-3xl max-w-md mx-4 ${
          state.preferences.minimalDesign
            ? 'bg-white dark:bg-white border border-gray-200 dark:border-gray-200 shadow-xl'
            : 'bg-white/5 border border-white/10 shadow-[0_16px_40px_rgba(31,38,135,0.2)] backdrop-blur-3xl before:absolute before:inset-0 before:rounded-3xl before:bg-gradient-to-br before:from-white/10 before:to-transparent before:pointer-events-none relative overflow-hidden'
        }`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
            state.preferences.minimalDesign
              ? 'bg-gray-100 dark:bg-gray-100 border border-gray-200 dark:border-gray-200'
              : 'bg-white/15 border border-white/25 backdrop-blur-xl'
          } shadow-lg relative z-10`}>
            <FileText className={`w-8 h-8 ${
              state.preferences.minimalDesign
                ? 'text-gray-600 dark:text-gray-600'
                : 'text-white'
            }`} />
          </div>
          <h3 className={`text-lg font-semibold mb-2 relative z-10 ${
            state.preferences.minimalDesign
              ? 'text-gray-900 dark:text-gray-900'
              : 'text-white drop-shadow-lg'
          }`}>
            {t('notes_view.no_note_selected')}
          </h3>
          <p className={`mb-6 relative z-10 ${
            state.preferences.minimalDesign
              ? 'text-gray-600 dark:text-gray-600'
              : 'text-white/90 drop-shadow-lg'
          }`}>
            {t('notes_view.select_note_or_create')}
          </p>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    const updatedNote: Note = {
      ...selectedNote,
              title: title.trim() || (i18n.language === 'en' ? 'Untitled Note' : 'Unbenannte Notiz'),
      content,
      tags,
      updatedAt: new Date().toISOString(),
    };

    dispatch({ type: 'UPDATE_NOTE', payload: updatedNote });
    setHasUnsavedChanges(false);
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
      setHasUnsavedChanges(true);
      setShowTagInput(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
    setHasUnsavedChanges(true);
  };

  const handlePin = () => {
    setIsPinned(!isPinned);
    
    if (isPinned) {
      dispatch({ type: 'UNPIN_NOTE', payload: selectedNote.id });
    } else {
      dispatch({ type: 'PIN_NOTE', payload: selectedNote.id });
    }
  };

  const handleArchive = () => {
    dispatch({ type: 'ARCHIVE_NOTE', payload: selectedNote.id });
    dispatch({ type: 'SELECT_NOTE', payload: null });
  };

  const toggleFullScreen = () => {
    const newFullScreenState = !isFullScreen;
    setIsFullScreen(newFullScreenState);
    onFullScreenToggle?.(newFullScreenState);
  };

  const handleLinkTask = (taskId: string) => {
    setLinkedTaskIds(prev => [...prev, taskId]);
    dispatch({ type: 'LINK_NOTE_TO_TASK', payload: { noteId: selectedNote.id, taskId } });
    setShowTaskSearch(false);
    setTaskSearchQuery('');
  };

  const handleUnlinkTask = (taskId: string) => {
    setLinkedTaskIds(prev => prev.filter(id => id !== taskId));
    dispatch({ type: 'UNLINK_NOTE_FROM_TASK', payload: { noteId: selectedNote.id, taskId } });
  };

  const handleLinkProject = (projectId: string) => {
    setLinkedProjectIds(prev => [...prev, projectId]);
    dispatch({ type: 'LINK_NOTE_TO_PROJECT', payload: { noteId: selectedNote.id, projectId } });
    setShowProjectSearch(false);
    setProjectSearchQuery('');
  };

  const handleUnlinkProject = (projectId: string) => {
    setLinkedProjectIds(prev => prev.filter(id => id !== projectId));
    dispatch({ type: 'UNLINK_NOTE_FROM_PROJECT', payload: { noteId: selectedNote.id, projectId } });
  };

  const handleLinkNote = (noteId: string) => {
    setLinkedNoteIds(prev => [...prev, noteId]);
    dispatch({ type: 'LINK_NOTE_TO_NOTE', payload: { noteId: selectedNote.id, linkedNoteId: noteId } });
    setShowNoteSearch(false);
    setNoteSearchQuery('');
  };

  const handleUnlinkNote = (noteId: string) => {
    setLinkedNoteIds(prev => prev.filter(id => id !== noteId));
    dispatch({ type: 'UNLINK_NOTE_FROM_NOTE', payload: { noteId: selectedNote.id, linkedNoteId: noteId } });
  };

  const handleExportPdf = () => {
    exportAsPdf(selectedNote);
    setShowExportMenu(false);
  };

  const handleExportMarkdown = () => {
    exportAsMarkdown(selectedNote);
    setShowExportMenu(false);
  };

  const handleExportTxt = () => {
    exportAsTxt(selectedNote);
    setShowExportMenu(false);
  };

  const handlePrint = () => {
    printNote(selectedNote);
    setShowExportMenu(false);
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setHasUnsavedChanges(true);
  };

  const handlePaste = async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const result = await handleImagePaste(event.nativeEvent, state.imageStorage);
    
    if (result.error) {
      console.error('Error pasting image:', result.error);
      // TODO: Show error notification
      return;
    }
    
    if (result.image && result.updatedStorage) {
      // Update image storage
      dispatch({ type: 'SET_IMAGE_STORAGE', payload: result.updatedStorage });
      
      // Insert image markdown at cursor position
      const markdown = getImageMarkdownReference(result.image);
      const textarea = event.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      const newContent = content.substring(0, start) + markdown + content.substring(end);
      setContent(newContent);
      setHasUnsavedChanges(true);
      
      // Set cursor position after the inserted markdown
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + markdown.length;
        textarea.focus();
      }, 0);
    }
  };

  return (
    <div className={`flex ${isFullScreen ? 'fixed inset-0 z-50' : 'flex-1 h-full'} ${
      state.preferences.minimalDesign
        ? 'bg-white dark:bg-white'
        : 'bg-white dark:bg-gray-800'
    }`}>
      {/* Main Editor */}
      <div className="flex-1 flex flex-col h-full">
        {/* Editor Header */}
        <div className={`p-4 border-b ${
          state.preferences.minimalDesign
            ? 'border-gray-200 dark:border-gray-200 bg-white dark:bg-white'
            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={handlePin}
                className={`p-2 rounded-lg transition-all ${
                  isPinned
                    ? 'text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                }`}
                style={isPinned ? getAccentColorStyles().bg : {}}
                title={isPinned ? pins.unpinNote() : pins.pinNote()}
              >
                <Pin className="w-4 h-4" />
              </button>
              
              <button
                onClick={handleArchive}
                className="p-2 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 transition-all"
                title={i18n.language === 'en' ? 'Archive' : 'Archivieren'}
              >
                <Archive className="w-4 h-4" />
              </button>
              
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="p-2 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 transition-all"
                  title={i18n.language === 'en' ? 'Export' : 'Exportieren'}
                >
                  <Download className="w-4 h-4" />
                </button>
                
                {showExportMenu && (
                  <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-[9999] py-2 min-w-[140px]" data-export-menu>
                    <button
                      onClick={handleExportTxt}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Als TXT</span>
                    </button>
                    <button
                      onClick={handleExportMarkdown}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Code className="w-4 h-4" />
                      <span>Als MD</span>
                    </button>
                    <button
                      onClick={handleExportPdf}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <FileDown className="w-4 h-4" />
                      <span>Als PDF</span>
                    </button>
                    <div className="border-t border-gray-200 dark:border-gray-600 my-1" />
                    <button
                      onClick={handlePrint}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Drucken</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Preview/Edit Toggle Switch */}
              <div 
                className="flex items-center rounded-lg p-1 transition-all duration-200 bg-gray-100 dark:bg-gray-700"
              >
                <button
                  onClick={() => setIsPreviewMode(false)}
                  disabled={selectedNote?.metadata?.contentType === 'html'}
                  className={`p-2 rounded-md transition-all duration-200 ${
                    selectedNote?.metadata?.contentType === 'html'
                      ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-50'
                      : !isPreviewMode
                        ? 'text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                  style={!isPreviewMode && selectedNote?.metadata?.contentType !== 'html' ? getAccentColorStyles().bg : {}}
                  title={selectedNote?.metadata?.contentType === 'html' 
                ? (i18n.language === 'en' ? 'Email content cannot be edited' : 'E-Mail-Inhalte können nicht bearbeitet werden')
                : (i18n.language === 'en' ? 'Edit' : 'Bearbeiten')}
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsPreviewMode(true)}
                  className={`p-2 rounded-md transition-all duration-200 ${
                    isPreviewMode
                      ? 'text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                  style={isPreviewMode ? getAccentColorStyles().bg : {}}
                  title={i18n.language === 'en' ? 'Preview' : 'Vorschau'}
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={toggleFullScreen}
                className="px-3 py-2 rounded-lg text-sm transition-all flex items-center space-x-2 bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
                title={isFullScreen 
                  ? (i18n.language === 'en' ? 'Exit fullscreen' : 'Vollbild verlassen')
                  : (i18n.language === 'en' ? 'Fullscreen' : 'Vollbild')}
              >
                {isFullScreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                <span>{isFullScreen 
                  ? (i18n.language === 'en' ? 'Minimize' : 'Verkleinern')
                  : (i18n.language === 'en' ? 'Fullscreen' : 'Vollbild')}</span>
              </button>
              
              {hasUnsavedChanges && (
                <button
                  onClick={handleSave}
                  className="px-4 py-2 text-white rounded-lg text-sm transition-all flex items-center space-x-2"
                  style={getAccentColorStyles().bg}
                >
                  <Save className="w-4 h-4" />
                  <span>{i18n.language === 'en' ? 'Save' : 'Speichern'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="mb-4">
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                onBlur={() => setIsEditingTitle(false)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    setIsEditingTitle(false);
                    textareaRef.current?.focus();
                  }
                }}
                className="w-full text-2xl font-bold bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400"
                placeholder={i18n.language === 'en' ? 'Note title...' : 'Titel der Notiz...'}
              />
            ) : (
              <h1
                onClick={() => setIsEditingTitle(true)}
                className="text-2xl font-bold text-gray-900 dark:text-white cursor-pointer"
              >
                {title || (i18n.language === 'en' ? 'Untitled Note' : 'Unbenannte Notiz')}
              </h1>
            )}
          </div>
        </div>

        {/* Editor Content */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {isPreviewMode ? (
            <div className="flex-1 flex justify-center overflow-y-auto py-4 px-4">
              <div 
                className="text-gray-900 dark:text-white text-sm leading-relaxed w-full max-w-4xl px-12 custom-scrollbar wysiwyg-content"
                style={{
                  scrollBehavior: 'smooth'
                }}
              >
                {/* Conditional rendering based on content type */}
                {selectedNote?.metadata?.contentType === 'html' ? (
                  <HtmlRenderer content={content} />
                ) : (
                  <MarkdownRenderer 
                    content={content}
                    onCheckboxChange={(newContent) => {
                      setContent(newContent);
                      setHasUnsavedChanges(true);
                    }}
                    emailViewModal={emailViewModal}
                    setEmailViewModal={setEmailViewModal}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex justify-center overflow-hidden py-4 px-4">
              <div className="w-full max-w-4xl px-12 flex flex-col min-h-0">
                {selectedNote?.metadata?.contentType === 'html' ? (
                  // For HTML content (emails), show a message that editing is not supported
                  <div className="flex-1 flex items-center justify-center text-center">
                    <div className="max-w-md">
                      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                          {noteEditor.emailContentTitle()}
                        </h3>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                          {noteEditor.emailContentDescription()}
                        </p>
                        <button
                          onClick={() => setIsPreviewMode(true)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                        >
                          {noteEditor.switchView()}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <WysiwygEditor
                    value={content}
                    onChange={handleContentChange}
                    placeholder={noteEditor.startWritingPlaceholder()}
                    className="flex-1 h-full overflow-y-auto"
                    useFullHeight={true}
                    showToolbar={true}
                    onClickOutside={() => setIsPreviewMode(true)}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Metadata Sidebar */}
      {!isFullScreen && (
        <div className={`w-80 border-l ${
          state.preferences.minimalDesign
            ? 'border-gray-200 dark:border-gray-200 bg-white dark:bg-white'
            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
        }`}>
          <div className="p-4 space-y-6">
            {/* Tags */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Tags</h3>
                <button
                  onClick={() => setShowTagInput(true)}
                  className="p-1 rounded transition-colors"
                  style={getAccentColorStyles().text}
                  title={i18n.language === 'en' ? 'Add tag' : 'Tag hinzufügen'}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-2">
                {tags.map(tag => (
                  <div key={tag} className="group flex items-center justify-between px-2 py-1 rounded-lg" style={{
                    backgroundColor: getAccentColorStyles().bgLight.backgroundColor,
                    color: getAccentColorStyles().text.color
                  }}>
                    <span className="text-sm">#{tag}</span>
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                
                {showTagInput && (
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Tag-Name..."
                      autoFocus
                    />
                    <button
                      onClick={handleAddTag}
                      className="px-2 py-1 text-white rounded text-sm transition-colors"
                      style={getAccentColorStyles().bg}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Linked Tasks */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">{t('tasks.modal.linked_tasks')}</h3>
                <button
                  onClick={() => setShowTaskSearch(true)}
                  className="p-1 rounded transition-colors"
                  style={getAccentColorStyles().text}
                  title={i18n.language === 'en' ? 'Link task' : 'Aufgabe verknüpfen'}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-2">
                {linkedTasks.map(task => (
                  <div 
                    key={task.id} 
                    className="group flex items-center justify-between p-2 rounded-lg"
                    style={{
                      backgroundColor: getAccentColorStyles().bg.backgroundColor + '15',
                    }}
                  >
                    <button
                      onClick={() => {
                        setSelectedTask(task);
                        setShowTaskModal(true);
                      }}
                      className="flex-1 text-left rounded transition-colors p-1"
                                              title={i18n.language === 'en' ? 'Open task' : 'Aufgabe öffnen'}
                      style={{
                        color: getAccentColorStyles().text.color,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = getAccentColorStyles().bg.backgroundColor + '25';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium" style={getAccentColorStyles().text}>
                          {task.title}
                        </span>
                        {task.completed && (
                          <span className="text-xs text-green-600 dark:text-green-400">✓</span>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-xs mt-1" style={{ color: getAccentColorStyles().text.color + '80' }}>
                          {task.description.substring(0, 50)}...
                        </p>
                      )}
                    </button>
                    <button
                      onClick={() => handleUnlinkTask(task.id)}
                      className="text-red-500 hover:text-red-700 transition-all duration-200 ml-2 opacity-0 group-hover:opacity-100"
                      title={i18n.language === 'en' ? 'Remove link' : 'Verknüpfung entfernen'}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Linked Projects */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">{t('tasks.modal.linked_projects')}</h3>
                <button
                  onClick={() => setShowProjectSearch(true)}
                  className="p-1 rounded transition-colors"
                  style={getAccentColorStyles().text}
                  title={i18n.language === 'en' ? 'Link project' : 'Projekt verknüpfen'}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-2">
                {linkedProjects.map(project => (
                  <div 
                    key={project.id} 
                    className="group flex items-center justify-between p-2 rounded-lg"
                    style={{
                      backgroundColor: getAccentColorStyles().bg.backgroundColor + '15',
                    }}
                  >
                    <button
                      onClick={() => {
                        // Navigate to project view (kanban)
                        window.dispatchEvent(new CustomEvent('navigate-to-project', { 
                          detail: { projectId: project.id } 
                        }));
                        // Set the project as selected
                        dispatch({ type: 'SET_PROJECT_KANBAN_SELECTED_PROJECT', payload: project.id });
                      }}
                      className="flex-1 flex items-center space-x-2 text-left rounded transition-colors p-1"
                                              title={i18n.language === 'en' ? 'Go to project' : 'Zum Projekt gehen'}
                      style={{
                        color: getAccentColorStyles().text.color,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = getAccentColorStyles().bg.backgroundColor + '25';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <FolderOpen className="w-4 h-4" style={getAccentColorStyles().text} />
                      <span className="text-sm font-medium" style={getAccentColorStyles().text}>
                        {project.title}
                      </span>
                    </button>
                    <button
                      onClick={() => handleUnlinkProject(project.id)}
                      className="text-red-500 hover:text-red-700 transition-all duration-200 ml-2 opacity-0 group-hover:opacity-100"
                      title={i18n.language === 'en' ? 'Remove link' : 'Verknüpfung entfernen'}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Linked Notes */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">{t('tasks.modal.linked_notes')}</h3>
                <button
                  onClick={() => setShowNoteSearch(true)}
                  className="p-1 rounded transition-colors"
                  style={getAccentColorStyles().text}
                  title={i18n.language === 'en' ? 'Link note' : 'Notiz verknüpfen'}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-2">
                {linkedNotes.map(note => {
                  // Helper functions to categorize and style notes
                  const getNoteType = (note: any): 'email' | 'dailynote' | 'note' => {
                    if (note.tags.includes('email')) return 'email';
                    if (note.tags.includes('daily-note') || note.title.match(/^\d{4}-\d{2}-\d{2}/)) return 'dailynote';
                    return 'note';
                  };

                  const getNoteIcon = (type: 'email' | 'dailynote' | 'note') => {
                    switch (type) {
                      case 'email': return Mail;
                      case 'dailynote': return BookOpen;
                      default: return FileText;
                    }
                  };

                  const getNoteTypeLabel = (type: 'email' | 'dailynote' | 'note') => {
                    switch (type) {
                      case 'email': return 'E-Mail';
                      case 'dailynote': return 'Daily Note';
                      default: return 'Notiz';
                    }
                  };

                  const noteType = getNoteType(note);
                  const NoteIcon = getNoteIcon(noteType);
                  const typeLabel = getNoteTypeLabel(noteType);

                  return (
                    <div 
                      key={note.id} 
                      className="group flex items-center justify-between p-2 rounded-lg"
                      style={{
                        backgroundColor: getAccentColorStyles().bg.backgroundColor + '15',
                      }}
                    >
                      <button
                        onClick={() => {
                          // Navigate to the linked note
                          dispatch({ type: 'SELECT_NOTE', payload: note });
                          dispatch({ type: 'SET_NOTES_VIEW', payload: 'editor' });
                        }}
                        className="flex-1 flex items-center space-x-2 text-left rounded transition-colors p-1"
                        title={i18n.language === 'en' ? 'Go to note' : 'Zur Notiz gehen'}
                        style={{
                          color: getAccentColorStyles().text.color,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = getAccentColorStyles().bg.backgroundColor + '25';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <NoteIcon className={`w-4 h-4 ${
                          noteType === 'email' ? 'text-blue-500' : 
                          noteType === 'dailynote' ? 'text-green-500' : 
                          'text-gray-400'
                        }`} style={noteType === 'note' ? getAccentColorStyles().text : {}} />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium" style={getAccentColorStyles().text}>
                              {note.title}
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                              noteType === 'email' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                              noteType === 'dailynote' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                              'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {typeLabel}
                            </span>
                          </div>
                        </div>
                        {note.pinned && (
                          <Pin className="w-3 h-3" style={getAccentColorStyles().text} />
                        )}
                      </button>
                      <button
                        onClick={() => handleUnlinkNote(note.id)}
                        className="text-red-500 hover:text-red-700 transition-all duration-200 ml-2 opacity-0 group-hover:opacity-100"
                        title={i18n.language === 'en' ? 'Remove link' : 'Verknüpfung entfernen'}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-600"></div>

            {/* Date Information */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">{t('tasks.modal.information')}</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <Calendar className="w-4 h-4" />
                  <span>
                  {i18n.language === 'en' ? 'Created: ' : 'Erstellt: '}
                  {format(new Date(selectedNote.createdAt), 'dd.MM.yyyy, HH:mm', { locale: i18n.language === 'en' ? enUS : de })}
                </span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>
                  {i18n.language === 'en' ? 'Modified: ' : 'Geändert: '}
                  {format(new Date(selectedNote.updatedAt), 'dd.MM.yyyy, HH:mm', { locale: i18n.language === 'en' ? enUS : de })}
                </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Search Modal */}
      {showTaskSearch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowTaskSearch(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-96 max-h-96" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Aufgabe verknüpfen</h3>
              <div className="mt-2 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={taskSearchQuery}
                  onChange={(e) => setTaskSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Aufgabe suchen..."
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {availableTasks.map(task => (
                <button
                  key={task.id}
                  onClick={() => handleLinkTask(task.id)}
                  className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                >
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{task.title}</div>
                  {task.description && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{task.description}</div>
                  )}
                </button>
              ))}
              {availableTasks.length === 0 && (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  Keine Aufgaben gefunden
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Project Search Modal */}
      {showProjectSearch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowProjectSearch(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-96 max-h-96" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Projekt verknüpfen</h3>
              <div className="mt-2 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={projectSearchQuery}
                  onChange={(e) => setProjectSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Projekt suchen..."
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {availableProjects.map(project => (
                <button
                  key={project.id}
                  onClick={() => handleLinkProject(project.id)}
                  className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                >
                  <div className="flex items-center space-x-2">
                    <FolderOpen className="w-4 h-4 text-gray-500" />
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{project.title}</div>
                  </div>
                </button>
              ))}
              {availableProjects.length === 0 && (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  Keine Projekte gefunden
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Task Modal */}
      {showTaskModal && selectedTask && (
        <TaskModal
          task={selectedTask}
          isOpen={showTaskModal}
          onClose={() => {
            setShowTaskModal(false);
            setSelectedTask(null);
          }}
        />
      )}

      {/* Note Link Modal */}
      <NoteLinkModal
        isOpen={showNoteSearch}
        onClose={() => setShowNoteSearch(false)}
        onLinkNote={handleLinkNote}
        excludeNoteIds={[selectedNote.id, ...linkedNoteIds]}
      />
    </div>
  );
} 