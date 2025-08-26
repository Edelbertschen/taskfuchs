import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Repeat, 
  Save, 
  X, 
  Eye, 
  AlertCircle, 
  CheckCircle, 
  ChevronDown,
  ChevronUp,
  Tag,
  Users,
  Settings,
  Star,
  PlayCircle,
  PauseCircle,
  Info,
  Plus,
  Minus,
  RotateCcw,
  Sparkles,
  Zap,
  Target,
  Timer,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from 'react-i18next';
import { recurrenceService } from '../../utils/recurrenceService';
import { MaterialIcon } from '../Common/MaterialIcon';
import type { 
  RecurrenceRule, 
  RecurrencePattern, 
  RecurrenceEnd, 
  RecurrenceTemplate, 
  RecurrenceFormData, 
  RecurrenceValidation,
  RecurrencePreview,
  WeekDay,
  TaskPriority,
  RECURRENCE_CONSTANTS
} from '../../types';

interface RecurringTaskInputProps {
  rule?: RecurrenceRule;
  isOpen: boolean;
  onClose: () => void;
  onSave: (rule: RecurrenceRule) => void;
  onDelete?: (ruleId: string) => void;
}

export function RecurringTaskInput({ rule, isOpen, onClose, onSave, onDelete }: RecurringTaskInputProps) {
  const { state } = useApp();
  const { t } = useTranslation();
  const [formData, setFormData] = useState<RecurrenceFormData>({
    name: '',
    description: '',
    template: {
      title: '',
      description: '',
      priority: 'none',
      estimatedTime: undefined,
      tags: [],
      columnId: '',
      kanbanColumnId: undefined,
      usePlaceholders: false,
      titlePattern: '',
      descriptionPattern: ''
    },
    pattern: {
      type: 'daily',
      interval: 1,
      weekdays: [],
      monthlyType: 'date',
      monthDay: 1,
      yearlyType: 'date',
      yearMonth: 1,
      yearDay: 1,
      specificTime: '',
      allDay: true,
      skipWeekends: false,
      skipHolidays: false,
      adjustForWeekends: 'skip'
    },
    end: {
      type: 'never'
    },
    generateAhead: RECURRENCE_CONSTANTS.DEFAULT_GENERATE_AHEAD,
    cleanupAfter: RECURRENCE_CONSTANTS.DEFAULT_CLEANUP_AFTER,
    isActive: true
  });

  const [validation, setValidation] = useState<RecurrenceValidation>({
    isValid: false,
    errors: [],
    warnings: []
  });

  const [showPreview, setShowPreview] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [newTag, setNewTag] = useState('');

  // Accent color styles
  const getAccentColorStyles = () => {
    const accentColor = state.preferences.accentColor;
    return {
      text: { color: accentColor },
      bg: { backgroundColor: accentColor },
      bgHover: { backgroundColor: accentColor + 'E6' },
      border: { borderColor: accentColor },
      bgLight: { backgroundColor: accentColor + '1A' },
      shadow: { boxShadow: `0 4px 12px ${accentColor}40` },
      glow: { boxShadow: `0 0 20px ${accentColor}30` }
    };
  };

  // Initialize form data from rule
  useEffect(() => {
    if (rule) {
      setFormData({
        name: rule.name,
        description: rule.description || '',
        template: rule.template,
        pattern: rule.pattern,
        end: rule.end,
        generateAhead: rule.generateAhead,
        cleanupAfter: rule.cleanupAfter,
        isActive: rule.isActive
      });
      setShowAdvanced(true);
    }
  }, [rule]);

  // Validate form data
  useEffect(() => {
    const mockRule: Partial<RecurrenceRule> = {
      name: formData.name,
      description: formData.description,
      template: formData.template,
      pattern: formData.pattern,
      end: formData.end,
      generateAhead: formData.generateAhead,
      cleanupAfter: formData.cleanupAfter,
      isActive: formData.isActive,
      exceptions: [],
      stats: {
        totalGenerated: 0,
        totalCompleted: 0,
        totalSkipped: 0,
        totalRescheduled: 0,
        averageCompletionTime: 0,
        completionRate: 0,
        streak: 0,
        longestStreak: 0
      }
    };

    const result = recurrenceService.validateRule(mockRule);
    setValidation(result);
  }, [formData]);

  // Handle form submission
  const handleSave = () => {
    if (!validation.isValid) return;

    const now = new Date().toISOString();
    const ruleToSave: RecurrenceRule = {
      id: rule?.id || `rule-${Date.now()}`,
      name: formData.name,
      description: formData.description,
      template: formData.template,
      pattern: formData.pattern,
      end: formData.end,
      exceptions: rule?.exceptions || [],
      generateAhead: formData.generateAhead,
      cleanupAfter: formData.cleanupAfter,
      isActive: formData.isActive,
      createdAt: rule?.createdAt || now,
      updatedAt: now,
      stats: rule?.stats || {
        totalGenerated: 0,
        totalCompleted: 0,
        totalSkipped: 0,
        totalRescheduled: 0,
        averageCompletionTime: 0,
        completionRate: 0,
        streak: 0,
        longestStreak: 0
      }
    };

    onSave(ruleToSave);
    onClose();
  };

  // Handle tag addition
  const handleAddTag = () => {
    if (newTag.trim() && !formData.template.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        template: {
          ...prev.template,
          tags: [...prev.template.tags, newTag.trim()]
        }
      }));
      setNewTag('');
    }
  };

  // Handle tag removal
  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      template: {
        ...prev.template,
        tags: prev.template.tags.filter(tag => tag !== tagToRemove)
      }
    }));
  };

  // Handle weekday toggle
  const handleWeekdayToggle = (weekday: WeekDay) => {
    setFormData(prev => ({
      ...prev,
      pattern: {
        ...prev.pattern,
        weekdays: prev.pattern.weekdays?.includes(weekday)
          ? prev.pattern.weekdays.filter(w => w !== weekday)
          : [...(prev.pattern.weekdays || []), weekday]
      }
    }));
  };

  // Get available columns
  const availableColumns = state.columns.filter(col => col.type === 'date' || col.type === 'project');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={getAccentColorStyles().bg}>
                <Repeat className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {rule ? 'Wiederkehrende Aufgabe bearbeiten' : 'Wiederkehrende Aufgabe erstellen'}
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  Erstelle automatisch wiederholende Aufgaben mit flexiblen Mustern
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6 space-y-8">
          {/* Basic Information */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Info className="w-5 h-5" style={getAccentColorStyles().text} />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Grundinformationen
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Name der Regel *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="z.B. Wöchentlicher Bericht"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 
                           bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent
                           transition-all duration-200"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Beschreibung
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optionale Beschreibung"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 
                           bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent
                           transition-all duration-200"
                />
              </div>
            </div>
          </div>

          {/* Task Template */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Target className="w-5 h-5" style={getAccentColorStyles().text} />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Aufgaben-Template
              </h3>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Aufgabentitel *
                  </label>
                  <input
                    type="text"
                    value={formData.template.title}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      template: { ...prev.template, title: e.target.value }
                    }))}
                    placeholder="z.B. {{date}} - Wochenbericht erstellen"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 
                             bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent
                             transition-all duration-200"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Spalte *
                  </label>
                  <select
                    value={formData.template.columnId}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      template: { ...prev.template, columnId: e.target.value }
                    }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 
                             bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent
                             transition-all duration-200"
                  >
                    <option value="">Spalte wählen</option>
                    {availableColumns.map(column => (
                      <option key={column.id} value={column.id}>
                        {column.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Beschreibung
                </label>
                <textarea
                  value={formData.template.description || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    template: { ...prev.template, description: e.target.value }
                  }))}
                  placeholder="Optionale Beschreibung für die Aufgabe"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 
                           bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent
                           transition-all duration-200"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Priorität
                  </label>
                  <select
                    value={formData.template.priority}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      template: { ...prev.template, priority: e.target.value as TaskPriority }
                    }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 
                             bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent
                             transition-all duration-200"
                  >
                    <option value="none">Keine Priorität</option>
                    <option value="low">Niedrig</option>
                    <option value="medium">Mittel</option>
                    <option value="high">Hoch</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Geschätzte Zeit (Min.)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.template.estimatedTime || ''}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      setFormData(prev => ({
                        ...prev,
                        template: { 
                          ...prev.template, 
                          estimatedTime: value && value > 0 ? value : undefined 
                        }
                      }));
                    }}
                    placeholder="z.B. 30"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 
                             bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent
                             transition-all duration-200"
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tags
                </label>
                <div className="flex space-x-2 mb-3">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Tag hinzufügen"
                    className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 
                             bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent
                             transition-all duration-200"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <button
                    onClick={handleAddTag}
                    disabled={!newTag.trim()}
                    className="px-4 py-2 rounded-xl font-medium text-white transition-all duration-200 
                             disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
                    style={getAccentColorStyles().bg}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.template.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium 
                               text-white transition-all duration-200 group"
                      style={getAccentColorStyles().bg}
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-2 w-4 h-4 flex items-center justify-center rounded-full 
                                 hover:bg-white/20 transition-colors duration-200"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Recurrence Pattern */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Repeat className="w-5 h-5" style={getAccentColorStyles().text} />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Wiederholungsmuster
              </h3>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Wiederholungstyp
                  </label>
                  <select
                    value={formData.pattern.type}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      pattern: { ...prev.pattern, type: e.target.value as any }
                    }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 
                             bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent
                             transition-all duration-200"
                  >
                    <option value="daily">Täglich</option>
                    <option value="weekly">Wöchentlich</option>
                    <option value="monthly">Monatlich</option>
                    <option value="yearly">Jährlich</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Intervall
                  </label>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Alle</span>
                    <input
                      type="number"
                      min="1"
                      max="999"
                      value={formData.pattern.interval}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        pattern: { ...prev.pattern, interval: Number(e.target.value) || 1 }
                      }))}
                      className="w-20 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 
                               bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                               focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent
                               transition-all duration-200"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {formData.pattern.type === 'daily' ? 'Tag(e)' :
                       formData.pattern.type === 'weekly' ? 'Woche(n)' :
                       formData.pattern.type === 'monthly' ? 'Monat(e)' :
                       'Jahr(e)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Weekly Pattern */}
              {formData.pattern.type === 'weekly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Wochentage
                  </label>
                  <div className="grid grid-cols-7 gap-2">
                    {RECURRENCE_CONSTANTS.WEEKDAYS.map((weekday) => (
                      <button
                        key={weekday}
                        onClick={() => handleWeekdayToggle(weekday)}
                        className={`p-3 rounded-lg border transition-all duration-200 text-sm font-medium
                                 ${formData.pattern.weekdays?.includes(weekday)
                                   ? 'text-white shadow-lg'
                                   : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                                 }`}
                        style={formData.pattern.weekdays?.includes(weekday) ? getAccentColorStyles().bg : {}}
                      >
                        {weekday === 'monday' ? t('planner.weekdays.mo') :
                         weekday === 'tuesday' ? t('planner.weekdays.tu') :
                         weekday === 'wednesday' ? t('planner.weekdays.we') :
                         weekday === 'thursday' ? t('planner.weekdays.th') :
                         weekday === 'friday' ? t('planner.weekdays.fr') :
                         weekday === 'saturday' ? t('planner.weekdays.sa') : t('planner.weekdays.su')}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Monthly Pattern */}
              {formData.pattern.type === 'monthly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Monatsmuster
                  </label>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        id="monthly-date"
                        name="monthlyType"
                        value="date"
                        checked={formData.pattern.monthlyType === 'date'}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          pattern: { ...prev.pattern, monthlyType: e.target.value as any }
                        }))}
                        className="w-4 h-4"
                      />
                      <label htmlFor="monthly-date" className="text-sm text-gray-700 dark:text-gray-300">
                        Am Tag
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={formData.pattern.monthDay}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          pattern: { ...prev.pattern, monthDay: Number(e.target.value) || 1 }
                        }))}
                        className="w-20 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 
                                 bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                                 focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent
                                 transition-all duration-200"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">des Monats</span>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        id="monthly-weekday"
                        name="monthlyType"
                        value="weekday"
                        checked={formData.pattern.monthlyType === 'weekday'}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          pattern: { ...prev.pattern, monthlyType: e.target.value as any }
                        }))}
                        className="w-4 h-4"
                      />
                      <label htmlFor="monthly-weekday" className="text-sm text-gray-700 dark:text-gray-300">
                        Am
                      </label>
                      <select
                        value={formData.pattern.monthWeekOccurrence}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          pattern: { ...prev.pattern, monthWeekOccurrence: Number(e.target.value) }
                        }))}
                        className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 
                                 bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                                 focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent
                                 transition-all duration-200"
                      >
                        {RECURRENCE_CONSTANTS.WEEK_OCCURRENCES.map(occ => (
                          <option key={occ.value} value={occ.value}>
                            {occ.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={formData.pattern.monthWeekday}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          pattern: { ...prev.pattern, monthWeekday: e.target.value as WeekDay }
                        }))}
                        className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 
                                 bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                                 focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent
                                 transition-all duration-200"
                      >
                        {RECURRENCE_CONSTANTS.WEEKDAYS.map(weekday => (
                          <option key={weekday} value={weekday}>
                            {weekday === 'monday' ? 'Montag' :
                             weekday === 'tuesday' ? 'Dienstag' :
                             weekday === 'wednesday' ? 'Mittwoch' :
                             weekday === 'thursday' ? 'Donnerstag' :
                             weekday === 'friday' ? 'Freitag' :
                             weekday === 'saturday' ? 'Samstag' : 'Sonntag'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Time Settings */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Zeiteinstellungen
                </label>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="all-day"
                      checked={formData.pattern.allDay}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        pattern: { ...prev.pattern, allDay: e.target.checked }
                      }))}
                      className="w-4 h-4 rounded"
                    />
                    <label htmlFor="all-day" className="text-sm text-gray-700 dark:text-gray-300">
                      Ganztägig
                    </label>
                  </div>
                  
                  {!formData.pattern.allDay && (
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <input
                        type="time"
                        value={formData.pattern.specificTime}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          pattern: { ...prev.pattern, specificTime: e.target.value }
                        }))}
                        className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 
                                 bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                                 focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent
                                 transition-all duration-200"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* End Conditions */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Timer className="w-5 h-5" style={getAccentColorStyles().text} />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Endkriterien
              </h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  id="end-never"
                  name="endType"
                  value="never"
                  checked={formData.end.type === 'never'}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    end: { ...prev.end, type: e.target.value as any }
                  }))}
                  className="w-4 h-4"
                />
                <label htmlFor="end-never" className="text-sm text-gray-700 dark:text-gray-300">
                  Niemals enden
                </label>
              </div>
              
              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  id="end-after"
                  name="endType"
                  value="after"
                  checked={formData.end.type === 'after'}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    end: { ...prev.end, type: e.target.value as any }
                  }))}
                  className="w-4 h-4"
                />
                <label htmlFor="end-after" className="text-sm text-gray-700 dark:text-gray-300">
                  Nach
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.end.count || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    end: { ...prev.end, count: Number(e.target.value) || undefined }
                  }))}
                  className="w-20 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 
                           bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent
                           transition-all duration-200"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">Wiederholungen</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  id="end-on-date"
                  name="endType"
                  value="on_date"
                  checked={formData.end.type === 'on_date'}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    end: { ...prev.end, type: e.target.value as any }
                  }))}
                  className="w-4 h-4"
                />
                <label htmlFor="end-on-date" className="text-sm text-gray-700 dark:text-gray-300">
                  Am
                </label>
                <input
                  type="date"
                  value={formData.end.date || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    end: { ...prev.end, date: e.target.value }
                  }))}
                  className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 
                           bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent
                           transition-all duration-200"
                />
              </div>
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full mb-4"
            >
              <div className="flex items-center space-x-3">
                <Settings className="w-5 h-5" style={getAccentColorStyles().text} />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Erweiterte Einstellungen
                </h3>
              </div>
              {showAdvanced ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            
            {showAdvanced && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tage im Voraus generieren
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={formData.generateAhead}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        generateAhead: Number(e.target.value) || RECURRENCE_CONSTANTS.DEFAULT_GENERATE_AHEAD
                      }))}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 
                               bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                               focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent
                               transition-all duration-200"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Aufräumen nach (Tage)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={formData.cleanupAfter}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        cleanupAfter: Number(e.target.value) || RECURRENCE_CONSTANTS.DEFAULT_CLEANUP_AFTER
                      }))}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 
                               bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                               focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent
                               transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="skip-weekends"
                      checked={formData.pattern.skipWeekends}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        pattern: { ...prev.pattern, skipWeekends: e.target.checked }
                      }))}
                      className="w-4 h-4 rounded"
                    />
                    <label htmlFor="skip-weekends" className="text-sm text-gray-700 dark:text-gray-300">
                      Wochenenden überspringen
                    </label>
                  </div>
                  
                  {/* Feiertage werden nicht mehr berücksichtigt
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="skip-holidays"
                      checked={formData.pattern.skipHolidays}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        pattern: { ...prev.pattern, skipHolidays: e.target.checked }
                      }))}
                      className="w-4 h-4 rounded"
                    />
                    <label htmlFor="skip-holidays" className="text-sm text-gray-700 dark:text-gray-300">
                      Feiertage überspringen
                    </label>
                  </div>
                  */}
                  
                  {(formData.pattern.skipWeekends || formData.pattern.skipHolidays) && (
                    <div className="ml-6">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Konfliktlösung
                      </label>
                      <select
                        value={formData.pattern.adjustForWeekends}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          pattern: { ...prev.pattern, adjustForWeekends: e.target.value as any }
                        }))}
                        className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 
                                 bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                                 focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent
                                 transition-all duration-200"
                      >
                        <option value="skip">Überspringen</option>
                        <option value="before">Auf vorherigen Werktag verschieben</option>
                        <option value="after">Auf nächsten Werktag verschieben</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center justify-between w-full mb-4"
            >
              <div className="flex items-center space-x-3">
                <Eye className="w-5 h-5" style={getAccentColorStyles().text} />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Vorschau
                </h3>
              </div>
              {showPreview ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            
            {showPreview && validation.preview && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {validation.preview.dates.map((date, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 rounded-lg bg-white dark:bg-gray-800">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {new Date(date).toLocaleDateString('de-DE', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  ))}
                </div>
                
                {validation.preview.hasMore && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                    ... und weitere
                  </p>
                )}
                
                {validation.preview.warnings.length > 0 && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                      <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                        Warnungen:
                      </span>
                    </div>
                    <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                      {validation.preview.warnings.map((warning, index) => (
                        <li key={index}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Validation Messages */}
          {validation.errors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-sm font-medium text-red-800 dark:text-red-200">
                  Fehler beheben:
                </span>
              </div>
              <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                {validation.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-6 rounded-b-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is-active"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="is-active" className="text-sm text-gray-700 dark:text-gray-300">
                  Regel ist aktiv
                </label>
              </div>
              
              {validation.isValid && (
                <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Bereit zum Speichern</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              {rule && onDelete && (
                <button
                  onClick={() => onDelete(rule.id)}
                  className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 
                           rounded-lg transition-all duration-200"
                >
                  Löschen
                </button>
              )}
              
              <button
                onClick={onClose}
                className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 
                         rounded-lg transition-all duration-200"
              >
                Abbrechen
              </button>
              
              <button
                onClick={handleSave}
                disabled={!validation.isValid}
                className="flex items-center space-x-2 px-6 py-2 rounded-lg font-medium text-white 
                         transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                         hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
                style={validation.isValid ? { ...getAccentColorStyles().bg, ...getAccentColorStyles().shadow } : {}}
              >
                <Save className="w-4 h-4" />
                <span>{rule ? 'Aktualisieren' : 'Erstellen'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 