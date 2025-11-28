import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Plus, Lightbulb, Clock, Tag, Calendar, AlertCircle, CheckCircle, Zap, HelpCircle, X } from 'lucide-react';
import { parseTaskInput, getParsingExamples, getParsingHelp } from '../../utils/taskParser';
import { useApp } from '../../context/AppContext';
import { useTranslation } from 'react-i18next';
import { useAppTranslation } from '../../utils/i18nHelpers';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import type { ParseResult, Column } from '../../types';

interface SmartTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetColumn?: Column;
  placeholder?: string;
  projectId?: string; // For project kanban context
  kanbanColumnId?: string; // For project kanban column
  defaultDate?: string; // ISO date string to pre-assign task to specific date
}

export function SmartTaskModal({ isOpen, onClose, targetColumn, placeholder, projectId, kanbanColumnId, defaultDate }: SmartTaskModalProps) {
  // Simplified close handling
  const protectedOnClose = useCallback((source?: string) => {
    onClose();
  }, [onClose]);
  const { state, dispatch } = useApp();
  const { t } = useTranslation();
  const { smartTask, forms } = useAppTranslation();
  
  // Get translated placeholder
  const actualPlaceholder = placeholder || forms.placeholderSmartTask();
  const [input, setInput] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [isQuickMode, setIsQuickMode] = useState(false);
  const [modalStable, setModalStable] = useState(false); // Prevent premature closing
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate dynamic colors based on accent color
  const colors = useMemo(() => {
    const accentColor = state.preferences.accentColor || '#f97316';
    
    const hexToHsl = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;
      
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }
      
      return [h * 360, s * 100, l * 100];
    };

    const hslToHex = (h: number, s: number, l: number) => {
      h = h % 360;
      s = Math.max(0, Math.min(100, s)) / 100;
      l = Math.max(0, Math.min(100, l)) / 100;
      
      const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - s * Math.min(l, 1 - l) * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
      };
      return `#${f(0)}${f(8)}${f(4)}`;
    };
    
    const [h, s, l] = hexToHsl(accentColor);
    
    return {
      primary: accentColor,
      light: hslToHex(h, Math.max(s * 0.3, 20), Math.min(l + 40, 95)),
      dark: hslToHex(h, Math.min(s, 80), Math.max(l - 20, 10)),
    };
  }, [state.preferences.accentColor]);

  // Parse input in real-time
  useEffect(() => {
    if (input.trim()) {
      const result = parseTaskInput(input);
      setParseResult(result);
    } else {
      setParseResult(null);
    }
  }, [input]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setInput('');
      setParseResult(null);
      setShowHelp(false);
      setShowExamples(false);
      setIsQuickMode(false);
    }
  }, [isOpen]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || !parseResult?.success || !parseResult.task) {
      return;
    }

    const task = parseResult.task;
    
    // ALWAYS use target column if provided (this is the column where the user clicked)
    // Only use parsed columnId as fallback if no targetColumn is specified
    let targetColumnId = targetColumn?.id;
    if (!targetColumnId) {
      // Only use parsed columnId if no targetColumn was specified
      targetColumnId = task.columnId;
    }
    
    // Final fallback to inbox if column doesn't exist
    if (!targetColumnId) {
      targetColumnId = 'inbox';
    }

    // Generate UUID with fallback for Firefox compatibility
    const generateUUID = () => {
      try {
        return crypto.randomUUID();
      } catch (error) {
        // Fallback for browsers that don't support crypto.randomUUID()
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      }
    };

    // Determine the correct column for tasks with dates
    let finalColumnId = undefined;
    let finalReminderDate = undefined;
    
    // PRIORITY 1: If task has a parsed date and is not for a project, ALWAYS place it in the date column
    // This overrides any targetColumn or defaultDate
    if (task.dueDate && !projectId && !kanbanColumnId) {
      const dueDate = new Date(task.dueDate);
      const dateStr = dueDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      finalColumnId = `date-${dateStr}`;
      finalReminderDate = dateStr;
      
      // Ensure the date column exists
      dispatch({ type: 'ENSURE_DATE_COLUMN', payload: dateStr });
    }
    // PRIORITY 2: If defaultDate is provided (e.g., from "Heute" view), use it
    else if (defaultDate && !projectId && !kanbanColumnId) {
      finalColumnId = `date-${defaultDate}`;
      finalReminderDate = defaultDate;
      
      // Ensure the date column exists
      dispatch({ type: 'ENSURE_DATE_COLUMN', payload: defaultDate });
    }
    
    // For project kanban tasks, don't set columnId - only use projectId and kanbanColumnId
    if (!projectId && !kanbanColumnId && !finalColumnId) {
      finalColumnId = targetColumn?.id || 'inbox';
    }

    // Create the task
    const newTask = {
      id: generateUUID(),
      title: task.title,
      description: task.description || '',
      completed: false,
      priority: task.priority, // Don't set default priority
      estimatedTime: task.estimatedTime && task.estimatedTime > 0 ? task.estimatedTime : undefined,
      tags: task.tags,
      subtasks: [],
      columnId: finalColumnId, // Use determined column (only for planner/inbox)
      projectId: projectId, // Project context
      kanbanColumnId: kanbanColumnId, // Kanban column context
      dueDate: task.dueDate,
      reminderDate: finalReminderDate, // Set from parsed date or will be set by automatic assignment below
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      position: Date.now()
    };

    console.log('🚀 Task creation debug:', {
      taskId: newTask.id,
      title: newTask.title,
      projectId: newTask.projectId,
      kanbanColumnId: newTask.kanbanColumnId,
      columnId: newTask.columnId,
      context: projectId ? 'project-kanban' : kanbanColumnId ? 'standalone-kanban' : 'planner-or-inbox'
    });

    // Automatic assignment based on target column type (only for non-project contexts)
    if (targetColumn && !projectId && !kanbanColumnId) {
      if (targetColumn.type === 'date' && targetColumn.date) {
        // Task added to date column - automatically assign date
        newTask.reminderDate = targetColumn.date;
        newTask.columnId = targetColumn.id;
        
        console.log('📅 Task automatically assigned to date column:', {
          taskId: newTask.id,
          columnId: targetColumn.id,
          date: targetColumn.date
        });
      } else if (targetColumn.type === 'project') {
        // Task added to project column - automatically assign project
        newTask.projectId = targetColumn.id;
        newTask.columnId = targetColumn.id;
        
        console.log('🗂️ Task automatically assigned to project column:', {
          taskId: newTask.id,
          projectId: targetColumn.id
        });
      }
    }

    // Add the task to the store
    dispatch({ type: 'ADD_TASK', payload: newTask });
    
    // Show quick feedback
    const feedbackToast = document.createElement('div');
    feedbackToast.className = 'fixed top-4 right-4 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm font-medium transition-all duration-300 ease-out transform';
    feedbackToast.style.backgroundColor = colors.primary;
    feedbackToast.textContent = `✓ ${task.title} hinzugefügt • Bereit für nächste Aufgabe`;
    feedbackToast.style.transform = 'translateX(100%)';
    document.body.appendChild(feedbackToast);
    
    // Smooth slide-in animation
    setTimeout(() => {
      feedbackToast.style.transform = 'translateX(0)';
    }, 10);
    
    setTimeout(() => {
      if (document.body.contains(feedbackToast)) {
        // Smooth slide-out animation
        feedbackToast.style.transform = 'translateX(100%)';
        feedbackToast.style.opacity = '0';
        setTimeout(() => {
          if (document.body.contains(feedbackToast)) {
            document.body.removeChild(feedbackToast);
          }
        }, 300);
      }
    }, 1500);
    
    console.log('[SmartTaskModal] Task added successfully, modal stays open for next task');
    
    // ALWAYS keep modal open - Reset input and parsing state for next task
    setInput('');
    setParseResult(null);
    setIsQuickMode(false);
    setShowExamples(false);
    
    // Smooth refocus with slight delay for better UX
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        // Add a subtle animation by briefly highlighting the input
        inputRef.current.style.transform = 'scale(1.02)';
        inputRef.current.style.transition = 'transform 0.2s ease-out';
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.style.transform = 'scale(1)';
          }
        }, 200);
      }
    }, 100);
  }, [input, parseResult, targetColumn, projectId, kanbanColumnId, dispatch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // ESC key closes the modal
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      protectedOnClose('ESC_KEY');
      return;
    }
    
    // Handle Enter for submitting task
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      e.stopPropagation();
      handleSubmit(e as any);
      return;
    }
  }, [input, protectedOnClose, handleSubmit]);

  const insertExample = useCallback((example: string) => {
    setInput(example);
    inputRef.current?.focus();
    setShowExamples(false);
  }, []);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      e.preventDefault();
      e.stopPropagation();
      protectedOnClose('BACKDROP_CLICK');
    }
  }, [protectedOnClose]);

  // Optimize event handlers
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  }, []);

  const handleInputFocus = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    if (!parseResult?.success && !parseResult?.errors.length) {
      e.currentTarget.style.borderColor = colors.primary;
    }
  }, [parseResult, colors.primary]);

  const handleInputBlur = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    if (!parseResult?.success && !parseResult?.errors.length) {
      e.currentTarget.style.borderColor = 'rgb(209 213 219)';
    }
  }, [parseResult]);

  const handleSubmitButtonMouseEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = colors.dark;
  }, [colors.dark]);

  const handleSubmitButtonMouseLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = colors.primary;
  }, [colors.primary]);

  // Close button handler
  const handleCloseClick = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    protectedOnClose('CLOSE_BUTTON');
  }, [protectedOnClose]);

  // Cancel button handler
  const handleCancelClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    protectedOnClose('CANCEL_BUTTON');
  }, [protectedOnClose]);

  // Handle modal lifecycle - focused on modal stability without timer interference
  useEffect(() => {
    if (isOpen) {
      // Mark modal as stable immediately
      setModalStable(true);
      
      // Prevent scroll on body when modal is open
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      
      // Focus the input when modal opens
      const focusTimer = setTimeout(() => {
        if (inputRef.current && document.contains(inputRef.current)) {
          inputRef.current.focus();
        }
      }, 50);

      // Handle ESC key to close modal
      const handleGlobalKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          protectedOnClose('GLOBAL_ESC_KEY');
        }
      };

      // Add global ESC handler
      document.addEventListener('keydown', handleGlobalKeyDown, { capture: true });

      return () => {
        document.removeEventListener('keydown', handleGlobalKeyDown, { capture: true });
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        clearTimeout(focusTimer);
      };
    }
  }, [isOpen, protectedOnClose]);

  if (!isOpen) return null;

  return (
    createPortal(
      <div 
        className="fixed inset-0 bg-black/50 p-4 flex items-center justify-center"
        style={{ zIndex: 1300 }}
        onClick={handleBackdropClick}
      >
        <div 
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {smartTask.title()}
              </h2>
              {targetColumn && (
                                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {smartTask.target()} <span className="font-medium" style={{ color: colors.primary }}>{targetColumn.title}</span>
                  </p>
              )}
              {isQuickMode && (
                <p className="text-xs mt-1 font-medium" style={{ color: colors.primary }}>
                  {smartTask.quickModeInfo()}
                </p>
              )}
            </div>
            <button
              onClick={handleCloseClick}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Input Field */}
              <div 
                className={`bg-gray-50 dark:bg-gray-700 rounded-lg border-2 transition-all duration-200 ${
                  parseResult?.success 
                    ? '' 
                    : parseResult?.errors.length
                    ? 'border-red-300 dark:border-red-600'
                    : 'border-gray-200 dark:border-gray-600'
                }`}
                style={
                  parseResult?.success 
                    ? { borderColor: colors.light }
                    : !parseResult?.errors.length 
                    ? { borderColor: 'rgb(209 213 219)' }
                    : {}
                }
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              >
                <div className="flex items-center p-4">
                  <Plus className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={actualPlaceholder}
                    className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none text-lg"
                  />
                  {parseResult?.success && (
                    <button
                      type="submit"
                      className="ml-2 p-2 text-white rounded-md transition-colors"
                      style={{ backgroundColor: colors.primary }}
                      onMouseEnter={handleSubmitButtonMouseEnter}
                      onMouseLeave={handleSubmitButtonMouseLeave}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Parse Preview */}
                {parseResult && (
                  <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-600">
                    {parseResult.success ? (
                      <div className="mt-3 space-y-3">
                        <div className="flex items-center text-sm" style={{ color: colors.primary }}>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          <span>{smartTask.readyToCreate()}</span>
                        </div>
                        
                        {/* Preview Cards */}
                        <div className="flex flex-wrap gap-2">
                          {parseResult.task?.title && (
                            <div className="bg-gray-100 dark:bg-gray-600 px-3 py-1 rounded text-sm">
                              <strong>{smartTask.previewTitle()}</strong> {parseResult.task.title}
                            </div>
                          )}
                          
                          {parseResult.task?.estimatedTime && parseResult.task.estimatedTime > 0 && (
                            <div className="bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded text-sm flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {parseResult.task.estimatedTime}m
                            </div>
                          )}
                          
                          {state.preferences.showPriorities && parseResult.task?.priority && (
                            <div className={`px-3 py-1 rounded text-sm ${
                              parseResult.task.priority === 'high' 
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                : parseResult.task.priority === 'medium'
                                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                                : ''
                            }`}
                            style={parseResult.task.priority === 'low' ? {
                              backgroundColor: colors.light,
                              color: colors.dark
                            } : {}}>
                              {parseResult.task.priority === 'high' ? '!!! Hoch' : 
                               parseResult.task.priority === 'medium' ? '!! Mittel' : '! Niedrig'}
                            </div>
                          )}
                          
                          {parseResult.task?.tags && parseResult.task.tags.length > 0 && (
                            <div className="bg-purple-100 dark:bg-purple-900/30 px-3 py-1 rounded text-sm flex items-center">
                              <Tag className="w-3 h-3 mr-1" />
                              {parseResult.task.tags.join(', ')}
                            </div>
                          )}
                          
                          {parseResult.task?.dueDate && (
                            <div className="bg-orange-100 dark:bg-orange-900/30 px-3 py-1 rounded text-sm flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {new Date(parseResult.task.dueDate).toLocaleDateString('de-DE')}
                            </div>
                          )}
                          
                          <div className="bg-indigo-100 dark:bg-indigo-900/30 px-3 py-1 rounded text-sm">
                            → {(() => {
                              // PRIORITY: Use the same logic as task creation - dates override target columns
                              if (parseResult.task?.dueDate && !projectId && !kanbanColumnId) {
                                const dueDate = new Date(parseResult.task.dueDate);
                                const dateStr = dueDate.toISOString().split('T')[0];
                                const dateColumn = state.columns.find(col => col.id === `date-${dateStr}`);
                                return dateColumn?.title || format(dueDate, 'dd.MM.yyyy', { locale: de });
                              }
                              return targetColumn?.title || 'Inbox';
                            })()}
                          </div>
                        </div>
                        
                        {parseResult.task?.description && (
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            <div><strong>Beschreibung:</strong></div>
                            <div className="prose prose-sm dark:prose-invert max-w-none mt-1
                              prose-headings:text-gray-700 dark:prose-headings:text-gray-300
                              prose-p:text-gray-600 dark:prose-p:text-gray-400
                              prose-strong:text-gray-700 dark:prose-strong:text-gray-300
                                                        prose-code:bg-gray-100 dark:prose-code:bg-gray-700 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                              prose-pre:bg-gray-100 dark:prose-pre:bg-gray-700 prose-pre:text-sm prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-gray-600
                              prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400 prose-blockquote:bg-gray-50 dark:prose-blockquote:bg-gray-700/50 prose-blockquote:py-1
                              prose-a:underline prose-a:font-bold prose-a:px-1 prose-a:py-0.5 prose-a:rounded prose-a:transition-all
                                prose-ul:text-gray-600 dark:prose-ul:text-gray-400
                                prose-ol:text-gray-600 dark:prose-ol:text-gray-400
                                prose-li:text-gray-600 dark:prose-li:text-gray-400
                                prose-table:text-gray-600 dark:prose-table:text-gray-400
                                prose-thead:border-gray-300 dark:prose-thead:border-gray-600
                                prose-th:bg-gray-50 dark:prose-th:bg-gray-700 prose-th:font-semibold prose-th:text-sm
                                prose-td:border-gray-200 dark:prose-td:border-gray-600 prose-td:text-sm
                                prose-hr:border-gray-300 dark:prose-hr:border-gray-600
                                prose-img:rounded-lg prose-img:shadow-sm prose-img:max-w-32 prose-img:max-h-32">
                              <ReactMarkdown 
                                remarkPlugins={[remarkGfm]}
                                components={{
                                                      a: ({ node, ...props }) => (
                                                    <a {...props} target="_blank" rel="noopener noreferrer" className="font-bold px-1 py-0.5 rounded transition-all underline" style={{ color: colors.primary, textDecorationColor: colors.primary }} />
                      ),
                                input: ({ node, ...props }) => (
                                  <input 
                                    {...props} 
                                    className="mr-2"
                      style={{ accentColor: colors.primary }} 
                                    disabled={false}
                                  />
                                )
                              }}
                              >
                                {parseResult.task.description}
                              </ReactMarkdown>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-3">
                        <div className="flex items-center text-sm text-red-600 dark:text-red-400 mb-2">
                          <AlertCircle className="w-4 h-4 mr-2" />
                          <span>{forms.parsingError()}</span>
                        </div>
                        {parseResult.errors.map((error, index) => (
                          <div key={index} className="text-sm text-red-600 dark:text-red-400 mb-1">
                            • {error}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Suggestions */}
                    {parseResult.suggestions && parseResult.suggestions.length > 0 && showHelp && (
                      <div className="mt-3">
                        <div className="flex items-center text-sm text-blue-600 dark:text-blue-400 mb-1">
                          <Lightbulb className="w-3 h-3 mr-1" />
                          <span>Tipps</span>
                        </div>
                        {parseResult.suggestions.map((suggestion, index) => (
                          <div key={index} className="text-sm text-blue-600 dark:text-blue-400 mb-1">
                            • {suggestion}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Help Buttons */}
              <div className="flex justify-between">
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowExamples(!showExamples)}
                    className="text-sm text-gray-500 dark:text-gray-400 transition-colors flex items-center"
                    onMouseEnter={(e) => e.currentTarget.style.color = colors.primary}
                    onMouseLeave={(e) => e.currentTarget.style.color = ''}
                  >
                    <Zap className="w-4 h-4 mr-1" />
                    {smartTask.examples()}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowHelp(!showHelp)}
                    className="text-sm text-gray-500 dark:text-gray-400 transition-colors flex items-center"
                    onMouseEnter={(e) => e.currentTarget.style.color = colors.primary}
                    onMouseLeave={(e) => e.currentTarget.style.color = ''}
                  >
                    <HelpCircle className="w-4 h-4 mr-1" />
                    {smartTask.help()}
                  </button>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={handleCancelClick}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  >
                    {smartTask.cancel()}
                  </button>
                  <button
                    type="submit"
                    disabled={!parseResult?.success}
                    className="px-6 py-2 text-white rounded-md disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                    style={!parseResult?.success ? {} : { backgroundColor: colors.primary }}
                    onMouseEnter={(e) => {
                      if (parseResult?.success) {
                        e.currentTarget.style.backgroundColor = colors.dark;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (parseResult?.success) {
                        e.currentTarget.style.backgroundColor = colors.primary;
                      }
                    }}
                  >
                    {smartTask.create()}
                  </button>
                </div>
              </div>
            </form>

            {/* Examples */}
            {showExamples && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">{smartTask.examplesTitle()}</h3>
                <div className="space-y-2">
                  {getParsingExamples().map((example, index) => (
                    <button
                      key={index}
                      onClick={() => insertExample(example)}
                      className="w-full text-left text-sm text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-600 p-2 rounded transition-colors"
                      onMouseEnter={(e) => e.currentTarget.style.color = colors.primary}
                      onMouseLeave={(e) => e.currentTarget.style.color = ''}
                    >
                      "{example}"
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Help */}
            {showHelp && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg max-h-64 overflow-y-auto">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">{smartTask.helpTitle()}</h3>
                <div className="space-y-4">
                  {getParsingHelp().map((section, index) => (
                    <div key={index}>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {section.category}
                      </h4>
                      <div className="space-y-1">
                        {section.items.map((item, itemIndex) => (
                          <div key={itemIndex} className="text-sm text-gray-500 dark:text-gray-400 pl-2">
                            • {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>,
      document.body
    )
  );
} 