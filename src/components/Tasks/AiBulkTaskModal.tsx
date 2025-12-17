import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Wand2, Loader2, CheckCircle, AlertCircle, Plus, Clock, Tag, Calendar, Flag } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from 'react-i18next';
import { aiAPI, type AIParsedTask } from '../../services/apiService';
import type { Column } from '../../types';

interface ParsedTaskPreview extends AIParsedTask {
  id: string;
  selected: boolean;
}

interface AiBulkTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AiBulkTaskModal({ isOpen, onClose }: AiBulkTaskModalProps) {
  const { state, dispatch } = useApp();
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [input, setInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedTasks, setParsedTasks] = useState<ParsedTaskPreview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'input' | 'preview'>('input');

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen && step === 'input') {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen, step]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setInput('');
      setParsedTasks([]);
      setError(null);
      setStep('input');
    }
  }, [isOpen]);

  const handleParse = async () => {
    if (!input.trim() || isParsing) return;
    
    setIsParsing(true);
    setError(null);
    
    try {
      // Gather context
      const projects = state.columns
        .filter((col: Column) => col.type === 'project')
        .map((col: Column) => col.title);
      const tags = state.tags.map(tag => tag.name);
      
      // Use the multiple tasks endpoint for bulk parsing
      const response = await aiAPI.parseMultipleTasks(input.trim(), { projects, tags });
      
      // Create preview with unique IDs for each task
      const previews: ParsedTaskPreview[] = response.tasks.map(task => ({
        ...task,
        id: crypto.randomUUID(),
        selected: true
      }));
      
      setParsedTasks(previews);
      setStep('preview');
    } catch (err: any) {
      setError(err.message || 'AI parsing failed');
    } finally {
      setIsParsing(false);
    }
  };

  const toggleTaskSelection = (id: string) => {
    setParsedTasks(prev => prev.map(task => 
      task.id === id ? { ...task, selected: !task.selected } : task
    ));
  };

  const handleCreateTasks = () => {
    const selectedTasks = parsedTasks.filter(t => t.selected);
    
    selectedTasks.forEach(task => {
      // Find project ID by name
      let projectId: string | undefined;
      if (task.projectName) {
        const project = state.columns.find(
          (col: Column) => col.type === 'project' && col.title.toLowerCase() === task.projectName?.toLowerCase()
        );
        projectId = project?.id;
      }

      // Determine column based on date
      let columnId: string | undefined;
      let reminderDate: string | undefined;
      
      if (task.dueDate && !projectId) {
        const dateStr = task.dueDate;
        columnId = `date-${dateStr}`;
        reminderDate = dateStr;
        dispatch({ type: 'ENSURE_DATE_COLUMN', payload: dateStr });
      }
      
      if (!columnId && !projectId) {
        columnId = 'inbox';
      }

      const newTask = {
        id: crypto.randomUUID(),
        title: task.title,
        description: task.description || '',
        completed: false,
        priority: task.priority || 'none',
        estimatedTime: task.estimatedTime || undefined,
        tags: task.tags || [],
        subtasks: [],
        columnId: projectId ? undefined : columnId,
        projectId: projectId,
        dueDate: task.dueDate || undefined,
        reminderDate: reminderDate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        position: Date.now()
      };

      dispatch({ type: 'ADD_TASK', payload: newTask });
    });

    onClose();
  };

  const handleBack = () => {
    setStep('input');
    setParsedTasks([]);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500 bg-red-100 dark:bg-red-900/30';
      case 'medium': return 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30';
      case 'low': return 'text-green-500 bg-green-100 dark:bg-green-900/30';
      default: return 'text-gray-400 bg-gray-100 dark:bg-gray-700';
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-500 to-pink-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {t('ai.bulkTaskTitle', 'KI-Aufgabenerfassung')}
              </h2>
              <p className="text-sm text-white/80">
                {t('ai.bulkTaskDescription', 'Beschreiben Sie Ihre Aufgaben in natürlicher Sprache')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'input' ? (
            <>
              {/* Input Step */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('ai.describeYourTasks', 'Beschreiben Sie Ihre Aufgaben')}
                </label>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Morgen muss ich den Bericht schreiben, der hohe Priorität hat und eine Stunde dauern wird. Am Freitag muss ich die Batterien im Thermostat wechseln und den Drucker ausschalten. Morgen muss ich 45 Minuten an meiner Jahresplanung arbeiten."
                  className="w-full h-40 px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-gray-900 dark:text-white placeholder-gray-400 resize-none"
                />
              </div>

              {/* Error Display */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-300">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {/* Example */}
              <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
                <h4 className="text-sm font-medium text-purple-900 dark:text-purple-200 mb-2">
                  {t('ai.exampleInput', 'Beispiel')}
                </h4>
                <p className="text-sm text-purple-700 dark:text-purple-300 italic">
                  "Tomorrow I have to write the report, which is a high priority and will take an hour. On Friday, I have to change the batteries in the thermostat."
                </p>
              </div>

              {/* Action Button */}
              <button
                onClick={handleParse}
                disabled={!input.trim() || isParsing}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t('ai.analyzing', 'Analysiere...')}
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    {t('ai.analyzeWithAI', 'Mit KI analysieren')}
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              {/* Preview Step */}
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {t('ai.parsedTasks', 'Erkannte Aufgaben')} ({parsedTasks.filter(t => t.selected).length})
                </h3>
                
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {parsedTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => toggleTaskSelection(task.id)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        task.selected
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          task.selected 
                            ? 'border-purple-500 bg-purple-500' 
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {task.selected && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                            {task.title}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {task.dueDate && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded text-xs">
                                <Calendar className="w-3 h-3" />
                                {new Date(task.dueDate).toLocaleDateString('de-DE')}
                              </span>
                            )}
                            {task.estimatedTime && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                                <Clock className="w-3 h-3" />
                                {task.estimatedTime}m
                              </span>
                            )}
                            {task.priority && task.priority !== 'none' && (
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${getPriorityColor(task.priority)}`}>
                                <Flag className="w-3 h-3" />
                                {task.priority === 'high' ? 'Hoch' : task.priority === 'medium' ? 'Mittel' : 'Niedrig'}
                              </span>
                            )}
                            {task.tags && task.tags.length > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs">
                                <Tag className="w-3 h-3" />
                                {task.tags.join(', ')}
                              </span>
                            )}
                            {task.projectName && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs">
                                📁 {task.projectName}
                              </span>
                            )}
                          </div>
                          {task.description && (
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleBack}
                  className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {t('common.back', 'Zurück')}
                </button>
                <button
                  onClick={handleCreateTasks}
                  disabled={parsedTasks.filter(t => t.selected).length === 0}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  {t('ai.createTasks', 'Aufgaben erstellen')} ({parsedTasks.filter(t => t.selected).length})
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default AiBulkTaskModal;

