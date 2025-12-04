import React, { useState, useRef, useEffect, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Plus, Lightbulb, Clock, Tag, Calendar, AlertCircle, CheckCircle, Sparkles, HelpCircle, X } from 'lucide-react';
import { parseTaskInput, getParsingExamples, getParsingHelp } from '../../utils/taskParser';
import { useApp } from '../../context/AppContext';
import { useAppTranslation } from '../../utils/i18nHelpers';
import type { ParseResult, Column } from '../../types';
import { useDebounce } from '../../utils/performance';
import { createPortal } from 'react-dom';

interface SmartTaskInputProps {
  placeholder?: string;
  autoFocus?: boolean;
  onTaskCreated?: () => void;
  projectId?: string;
  kanbanColumnId?: string;
  targetColumnId?: string;
}

export function SmartTaskInput({ placeholder, autoFocus = false, onTaskCreated, projectId, kanbanColumnId, targetColumnId }: SmartTaskInputProps) {
  const { state, dispatch } = useApp();
  const { forms } = useAppTranslation();
  const columns = state.columns;
  
  // Use provided placeholder or default to translation
  const actualPlaceholder = placeholder || forms.placeholderNewTask();
  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [isQuickMode, setIsQuickMode] = useState(false);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  // 🔍 Performance Boost: Debounced input für Smart-Parsing
  const debouncedInput = useDebounce(input, 150); // 150ms Delay für flüssigeres Tippen

  // Aktualisiere Parsing nur bei debouncedInput changes
  useEffect(() => {
    if (debouncedInput.trim()) {
      const parsed = parseTaskInput(debouncedInput);
      setParseResult(parsed);
      
      // If parsing indicates project selector should be opened
      if (parsed.success && parsed.task?.openProjectSelector) {
        setShowProjectSelector(true);
      }
    } else {
      setParseResult(null);
    }
  }, [debouncedInput]);

  // Auto-focus if requested
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleProjectSelect = (projId: string) => {
    setSelectedProject(projId);
    setShowProjectSelector(false);
    // Don't close the form - user can now add the task with the selected project
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || !parseResult?.success || !parseResult.task) {
      return;
    }

    const task = parseResult.task;
    
    // If project selector was used, use selected project
    // Otherwise use parsed projectId or component prop
    const finalProjectId = selectedProject || task.projectId || projectId;
    
    // ALWAYS use target column if provided (this is the column where the user is working)
    // Only use parsed columnId as fallback if no targetColumnId is specified
    let targetColumn = targetColumnId;
    if (!targetColumn && !finalProjectId) {
      // Only use parsed columnId if no targetColumnId and no projectId was specified
      targetColumn = task.columnId;
    }
    
    // Final fallback to first column or inbox if column doesn't exist
    if (!targetColumn && !finalProjectId && (!columns.find((col: Column) => col.id === task.columnId))) {
      targetColumn = columns[0]?.id || 'inbox';
    }

    // Determine the correct column for tasks with dates
    let finalColumnId = targetColumn;
    let finalReminderDate = undefined;
    
    // PRIORITY: If task has a parsed date and is not for a project, ALWAYS place it in the date column
    // This overrides any targetColumnId that might be set
    if (task.dueDate && !finalProjectId && !kanbanColumnId) {
      const dueDate = new Date(task.dueDate);
      const dateStr = dueDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      finalColumnId = `date-${dateStr}`;
      finalReminderDate = dateStr;
      
      // Ensure the date column exists
      dispatch({ type: 'ENSURE_DATE_COLUMN', payload: dateStr });
    }
    
    // Fallback to inbox only if no date, no project, and no other assignment
    if (!finalColumnId && !finalProjectId) {
      finalColumnId = 'inbox';
    }

    // Apply active filters to new task
    // Merge parsed tags with active tag filters (remove duplicates)
    const parsedTags = task.tags || [];
    const filterTags = state.activeTagFilters || [];
    const mergedTags = [...new Set([...parsedTags, ...filterTags])];
    
    // Apply priority filter if exactly one is active and task has no explicit priority
    const filterPriorities = state.activePriorityFilters || [];
    const finalPriority = task.priority || (filterPriorities.length === 1 ? filterPriorities[0] : undefined);

    // Create the task using dispatch
    const newTask = {
      id: crypto.randomUUID(),
      title: task.title,
      description: task.description || '',
      completed: false,
      priority: finalPriority, // Apply filter priority if no explicit priority
      estimatedTime: task.estimatedTime,
      tags: mergedTags, // Merged tags from parser and active filters
      subtasks: [],
      columnId: finalProjectId ? undefined : finalColumnId, // Für Projekt-Aufgaben kein columnId, sonst final column
      projectId: finalProjectId, // Automatische Zuordnung zum Projekt (from parser or prop or selector)
      kanbanColumnId: kanbanColumnId, // Zuordnung zur Projekt-Spalte
      dueDate: task.dueDate,
      reminderDate: finalReminderDate, // Set from parsed date or will be set by automatic assignment below
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      position: Date.now() // Simple position based on timestamp
    };

    // Automatic assignment based on target column type
    if (targetColumn && !finalProjectId && !kanbanColumnId) {
      const targetColumnObj = columns.find((col: Column) => col.id === targetColumn);
      
      if (targetColumnObj?.type === 'date' && targetColumnObj.date) {
        // Task added to date column - automatically assign date
        newTask.reminderDate = targetColumnObj.date;
        newTask.columnId = targetColumnObj.id;
        
        console.log('📅 Task automatically assigned to date column:', {
          taskId: newTask.id,
          columnId: targetColumnObj.id,
          date: targetColumnObj.date
        });
      } else if (targetColumnObj?.type === 'project') {
        // Task added to project column - automatically assign project
        newTask.projectId = targetColumnObj.id;
        newTask.columnId = targetColumnObj.id;
        
        console.log('🗂️ Task automatically assigned to project column:', {
          taskId: newTask.id,
          projectId: targetColumnObj.id
        });
      }
    }

    dispatch({
      type: 'ADD_TASK',
      payload: newTask
    });

    // Reset form but keep expanded in quick mode
    setInput('');
    setParseResult(null);
    setSelectedProject(undefined);
    
    // In quick mode, keep expanded and refocus
    if (isQuickMode) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
    } else {
      setIsExpanded(false);
    }
    
    // Callback
    onTaskCreated?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Enable quick mode when Shift+Enter or just Enter with content
    if (e.key === 'Enter' && !e.shiftKey) {
      if (input.trim() && parseResult?.success) {
        setIsQuickMode(true);
        handleSubmit(e as any);
      }
    }
    
    // Exit quick mode with Escape
    if (e.key === 'Escape') {
      setIsQuickMode(false);
      setIsExpanded(false);
      setShowProjectSelector(false);
      inputRef.current?.blur();
    }
  };

  const handleInputFocus = () => {
    setIsExpanded(true);
  };

  const handleInputBlur = () => {
    // Delay collapse to allow clicking on buttons
    // Don't collapse in quick mode
    if (!isQuickMode) {
      setTimeout(() => {
        if (!input.trim()) {
          setIsExpanded(false);
        }
      }, 200);
    }
  };

  const insertExample = (example: string) => {
    setInput(example);
    inputRef.current?.focus();
    setShowExamples(false);
  };

  return (
    <div className="relative">
      {/* Project Selector Modal */}
      {showProjectSelector && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowProjectSelector(false)}
          />
          
          {/* Modal */}
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Projekt auswählen
              </h3>
              <button
                onClick={() => setShowProjectSelector(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="max-h-96 overflow-y-auto space-y-2">
              {state.columns && state.columns.filter(col => col.type === 'project').length > 0 ? (
                state.columns
                  .filter(col => col.type === 'project')
                  .map(project => (
                  <button
                    key={project.id}
                    onClick={() => handleProjectSelect(project.id)}
                    className="w-full text-left px-4 py-3 rounded-lg hover:bg-accent/10 dark:hover:bg-accent/20 transition-colors border border-gray-200 dark:border-gray-700"
                  >
                    <div className="font-medium text-gray-900 dark:text-white">{project.title}</div>
                  </button>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  Keine Projekte verfügbar
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Main Input */}
      <form onSubmit={handleSubmit} className="relative">
        <div className={`bg-white dark:bg-gray-800 rounded-lg border-2 transition-all duration-200 ${
          isExpanded 
            ? 'border-accent shadow-lg' 
            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
        }`}>
          <div className="flex items-center p-3">
            <Plus className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              onKeyDown={handleKeyDown}
              placeholder={isQuickMode ? forms.placeholderQuickMode() : actualPlaceholder}
              className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none"
            />
            {isQuickMode && (
              <div className="mr-3 px-2 py-1 text-xs bg-accent text-white rounded-md animate-pulse">
                {forms.quickMode()}
              </div>
            )}
            {parseResult?.success && !parseResult.task?.openProjectSelector && (
              <button
                type="submit"
                className="ml-2 p-2 bg-accent text-white rounded-md hover:bg-accent/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
            {selectedProject && (
              <div className="ml-2 px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-md">
                ✓ Projekt gewählt
              </div>
            )}
          </div>

          {/* Parse Preview */}
          {isExpanded && parseResult && (
            <div className="px-3 pb-3 border-t border-gray-100 dark:border-gray-700">
              {parseResult.success ? (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    <span>{parseResult.task?.openProjectSelector ? 'Projekt auswählen' : 'Aufgabe bereit zum Erstellen'}</span>
                    {isQuickMode && !parseResult.task?.openProjectSelector && (
                      <span className="ml-2 text-xs bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded">
                        Enter zum Erstellen & Weiter
                      </span>
                    )}
                  </div>
                  
                  {/* Preview Cards */}
                  {!parseResult.task?.openProjectSelector && (
                    <div className="flex flex-wrap gap-2">
                      {parseResult.task?.title && (
                        <div className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">
                          <strong>Titel:</strong> {parseResult.task.title}
                        </div>
                      )}
                      
                      {parseResult.task?.estimatedTime && parseResult.task.estimatedTime > 0 && (
                        <div className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded text-xs flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {parseResult.task.estimatedTime}m
                        </div>
                      )}
                      
                      {state.preferences.showPriorities && parseResult.task?.priority && (
                        <div className={`px-2 py-1 rounded text-xs ${
                          parseResult.task.priority === 'high' 
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                            : parseResult.task.priority === 'medium'
                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                            : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        }`}>
                          {parseResult.task.priority === 'high' ? '!!! Hoch' : 
                           parseResult.task.priority === 'medium' ? '!! Mittel' : '! Niedrig'}
                        </div>
                      )}
                      
                      {parseResult.task?.tags && parseResult.task.tags.length > 0 && (
                        <div className="bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded text-xs flex items-center">
                          <Tag className="w-3 h-3 mr-1" />
                          {parseResult.task.tags.join(', ')}
                        </div>
                      )}
                      
                      {parseResult.task?.dueDate && (
                        <div className="bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded text-xs flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(parseResult.task.dueDate).toLocaleDateString('de-DE')}
                        </div>
                      )}
                      
                      {parseResult.task?.columnId && (
                        <div className="bg-indigo-100 dark:bg-indigo-900/30 px-2 py-1 rounded text-xs">
                          → {columns.find((col: Column) => col.id === parseResult.task?.columnId)?.title || parseResult.task.columnId}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {parseResult.task?.description && !parseResult.task?.openProjectSelector && (
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                      <div><strong>Beschreibung:</strong></div>
                      <div className="prose prose-xs dark:prose-invert max-w-none mt-1
                        prose-headings:text-gray-700 dark:prose-headings:text-gray-300
                        prose-p:text-gray-600 dark:prose-p:text-gray-400
                        prose-strong:text-gray-700 dark:prose-strong:text-gray-300
                        prose-code:text-accent prose-code:bg-gray-100 dark:prose-code:bg-gray-700 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                        prose-pre:bg-gray-100 dark:prose-pre:bg-gray-700 prose-pre:text-xs prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-gray-600
                        prose-blockquote:border-accent prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400 prose-blockquote:bg-gray-50 dark:prose-blockquote:bg-gray-700/50
                        prose-a:text-accent hover:prose-a:text-accent prose-a:underline prose-a:decoration-accent hover:prose-a:decoration-accent prose-a:font-bold hover:prose-a:bg-accent/10 prose-a:px-0.5 prose-a:py-0.5 prose-a:rounded prose-a:transition-all prose-a:text-xs
                        prose-ul:text-gray-600 dark:prose-ul:text-gray-400
                        prose-ol:text-gray-600 dark:prose-ol:text-gray-400
                        prose-li:text-gray-600 dark:prose-li:text-gray-400
                        prose-table:text-gray-600 dark:prose-table:text-gray-400
                        prose-thead:border-gray-300 dark:prose-thead:border-gray-600
                        prose-th:bg-gray-50 dark:prose-th:bg-gray-700 prose-th:text-xs
                        prose-td:border-gray-200 dark:prose-td:border-gray-600 prose-td:text-xs
                        prose-hr:border-gray-300 dark:prose-hr:border-gray-600
                        prose-img:rounded prose-img:max-w-20 prose-img:max-h-20">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            a: ({ node, ...props }) => (
                              <a {...props} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent font-bold hover:bg-accent/10 px-0.5 py-0.5 rounded transition-all underline decoration-accent" />
                            ),
                            input: ({ node, ...props }) => (
                              <input 
                                {...props} 
                                className="mr-1 accent-accent scale-75" 
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
                    <div key={index} className="text-xs text-red-600 dark:text-red-400 mb-1">
                      • {error}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Suggestions */}
              {parseResult.suggestions && parseResult.suggestions.length > 0 && showHelp && (
                <div className="mt-3">
                  <div className="flex items-center text-xs text-blue-600 dark:text-blue-400 mb-1">
                    <Lightbulb className="w-3 h-3 mr-1" />
                    <span>Tipps</span>
                  </div>
                  {parseResult.suggestions.map((suggestion, index) => (
                    <div key={index} className="text-xs text-blue-600 dark:text-blue-400 mb-1">
                      • {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </form>

      {/* Help Buttons */}
      {isExpanded && (
        <div className="flex justify-end mt-2 space-x-2">
          <button
            type="button"
            onClick={() => setShowExamples(!showExamples)}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-accent transition-colors flex items-center"
          >
            <Sparkles className="w-3 h-3 mr-1" />
            Beispiele
          </button>
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-accent transition-colors flex items-center"
          >
            <HelpCircle className="w-3 h-3 mr-1" />
            Hilfe
          </button>
        </div>
      )}

      {/* Examples Dropdown */}
      {showExamples && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-50">
          <div className="p-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Beispiele zum Ausprobieren</h3>
            <div className="space-y-1">
              {getParsingExamples().map((example, index) => (
                <button
                  key={index}
                  onClick={() => insertExample(example)}
                  className="w-full text-left text-xs text-gray-600 dark:text-gray-400 hover:text-accent hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded transition-colors"
                >
                  "{example}"
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Help Dropdown */}
      {showHelp && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-50 max-h-96 overflow-y-auto">
          <div className="p-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Smart Parsing Hilfe</h3>
            <div className="space-y-3">
              {getParsingHelp().map((section, index) => (
                <div key={index}>
                  <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {section.category}
                  </h4>
                  <div className="space-y-1">
                    {section.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="text-xs text-gray-500 dark:text-gray-400 pl-2">
                        • {item}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 