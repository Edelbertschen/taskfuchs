import React, { useState, useEffect } from 'react';
import { Repeat, Calendar, Clock, ChevronDown, ChevronUp, Check, X, AlertCircle, Info } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAppTranslation } from '../../utils/i18nHelpers';
import { recurrenceService } from '../../utils/recurrenceService';
import { format, addDays, startOfWeek, endOfWeek, addWeeks, addMonths } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import type { Task, RecurrenceRule, RecurrencePattern, RecurrenceEnd, WeekDay } from '../../types';

interface RecurringTaskSectionProps {
  task: Task | null;
  onRecurrenceChange: (recurrenceRule: RecurrenceRule | null) => void;
  className?: string;
}

export function RecurringTaskSection({ task, onRecurrenceChange, className = '' }: RecurringTaskSectionProps) {
  const { state } = useApp();
  const { taskModal } = useAppTranslation();
  const { i18n } = useTranslation();
  const currentLocale = i18n.language === 'de' ? de : enUS;
  const [isEnabled, setIsEnabled] = useState(false);
  const [showRecurrenceFields, setShowRecurrenceFields] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [ruleId, setRuleId] = useState<string>(`rule-${Date.now()}`);
  const [recurrenceData, setRecurrenceData] = useState<{
    pattern: RecurrencePattern;
    end: RecurrenceEnd;
  }>({
    pattern: {
      type: 'weekly',
      interval: 1,
      weekdays: ['monday'] as WeekDay[],
      allDay: true,
      skipWeekends: false,
      skipHolidays: true,
      adjustForWeekends: 'skip'
    },
    end: {
      type: 'never'
    }
  });

  // Initialize from existing recurrence rule if task has one
  useEffect(() => {
    if (task?.recurrenceRuleId) {
      const existingRule = state.recurrence.rules.find(rule => rule.id === task.recurrenceRuleId);
      if (existingRule) {
        setIsEnabled(true);
        setShowRecurrenceFields(true);
        setRuleId(existingRule.id);
        setRecurrenceData({
          pattern: existingRule.pattern,
          end: existingRule.end
        });
        // Notify parent component about the existing rule
        onRecurrenceChange(existingRule);
      }
    }
  }, [task?.recurrenceRuleId, state.recurrence.rules, onRecurrenceChange]);

  // Initialize showRecurrenceFields when recurrence is enabled
  useEffect(() => {
    setShowRecurrenceFields(isEnabled);
  }, [isEnabled]);

  const getAccentColorStyles = () => {
    const accentColor = state.preferences.accentColor;
    return {
      bg: { backgroundColor: accentColor },
      bgHover: { backgroundColor: accentColor + 'dd' },
      text: { color: accentColor },
      border: { borderColor: accentColor },
      bgLight: { backgroundColor: accentColor + '1A' },
      bgVeryLight: { backgroundColor: accentColor + '0D' }
    };
  };

  // Helper function to create RecurrenceRule
  const createRecurrenceRule = (): RecurrenceRule | null => {
    if (!task) return null;
    
    return {
      id: ruleId,
      name: task.title,
      description: task.description,
      template: {
        title: task.title,
        description: task.description,
        priority: task.priority,
        estimatedTime: task.estimatedTime,
        tags: task.tags,
        columnId: task.columnId,
        usePlaceholders: false,
        titlePattern: '',
        descriptionPattern: ''
      },
      pattern: recurrenceData.pattern,
      end: recurrenceData.end,
      exceptions: [],
      generateAhead: 30,
      cleanupAfter: 90,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
  };

  // Generate preview of next occurrences
  const getPreviewDates = () => {
    if (!isEnabled || !task) return [];
    
    try {
      const rule: RecurrenceRule = {
        id: 'preview',
        name: task.title,
        description: task.description,
        template: {
          title: task.title,
          description: task.description,
          priority: task.priority,
          estimatedTime: task.estimatedTime,
          tags: task.tags,
          columnId: task.columnId,
          usePlaceholders: false,
          titlePattern: '',
          descriptionPattern: ''
        },
        pattern: recurrenceData.pattern,
        end: recurrenceData.end,
        exceptions: [],
        generateAhead: 30,
        cleanupAfter: 90,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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

      const startDate = new Date();
      return recurrenceService.generateOccurrences(rule, startDate, 3);
    } catch (error) {
      console.error('Error generating preview:', error);
      return [];
    }
  };

  const handleToggle = () => {
    const newEnabled = !isEnabled;
    setIsEnabled(newEnabled);
    setShowRecurrenceFields(newEnabled);
    setShowDetails(newEnabled); // Direkt Details öffnen
    
    if (newEnabled) {
      // Check if we already have a rule for this task
      const existingRule = task?.recurrenceRuleId ? 
        state.recurrence.rules.find(rule => rule.id === task.recurrenceRuleId) : null;
      
      if (existingRule) {
        // Use existing rule
        setRuleId(existingRule.id);
        setRecurrenceData({
          pattern: existingRule.pattern,
          end: existingRule.end
        });
        onRecurrenceChange(existingRule);
      } else {
        // Generate new rule ID when enabling
        setRuleId(`rule-${Date.now()}`);
        const rule = createRecurrenceRule();
        onRecurrenceChange(rule);
      }
    } else {
      onRecurrenceChange(null);
    }
  };

  const handlePatternChange = (updates: Partial<RecurrencePattern>) => {
    setRecurrenceData(prev => ({
      ...prev,
      pattern: { ...prev.pattern, ...updates }
    }));
  };

  const handleEndChange = (updates: Partial<RecurrenceEnd>) => {
    setRecurrenceData(prev => ({
      ...prev,
      end: { ...prev.end, ...updates }
    }));
  };

  // Update recurrence rule when data changes and it's enabled
  useEffect(() => {
    if (isEnabled) {
      const rule = createRecurrenceRule();
      onRecurrenceChange(rule);
    }
  }, [recurrenceData.pattern, recurrenceData.end, isEnabled, task?.id, ruleId]);

  const getPatternDescription = () => {
    const { pattern } = recurrenceData;
    
    switch (pattern.type) {
      case 'daily':
        return pattern.interval === 1 ? 'Täglich' : `Alle ${pattern.interval} Tage`;
      case 'weekly':
        if (pattern.weekdays && pattern.weekdays.length > 0) {
          const weekdayNames = {
            'monday': 'Mo',
            'tuesday': 'Di',
            'wednesday': 'Mi',
            'thursday': 'Do',
            'friday': 'Fr',
            'saturday': 'Sa',
            'sunday': 'So'
          };
          const days = pattern.weekdays.map(day => weekdayNames[day]).join(', ');
          return pattern.interval === 1 ? `Wöchentlich (${days})` : `Alle ${pattern.interval} Wochen (${days})`;
        }
        return pattern.interval === 1 ? 'Wöchentlich' : `Alle ${pattern.interval} Wochen`;
      case 'monthly':
        return pattern.interval === 1 ? 'Monatlich' : `Alle ${pattern.interval} Monate`;
      case 'yearly':
        return pattern.interval === 1 ? 'Jährlich' : `Alle ${pattern.interval} Jahre`;
      default:
        return 'Benutzerdefiniert';
    }
  };

  const previewDates = getPreviewDates();

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {taskModal.recurrence()}
        </label>
        {!showRecurrenceFields && (
          <button
            onClick={handleToggle}
            className="w-5 h-5 flex items-center justify-center text-xs hover:opacity-80 transition-colors rounded"
            style={getAccentColorStyles().text}
            title="Wiederholung hinzufügen"
          >
            +
          </button>
        )}
      </div>

      {showRecurrenceFields && (
        <div className="space-y-4">
          {/* Wiederholung Display - same format as reminder/deadline */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Repeat className="w-4 h-4" style={getAccentColorStyles().text} />
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-sm font-medium hover:opacity-80 transition-colors underline decoration-dotted"
                style={getAccentColorStyles().text}
                title="Details bearbeiten"
              >
                {getPatternDescription()}
                {recurrenceData.pattern.skipWeekends && ', Wochenenden überspringen'}
                {recurrenceData.end.type === 'after' && `, endet nach ${recurrenceData.end.count} Terminen`}
              </button>
            </div>
            <button
              onClick={() => {
                setIsEnabled(false);
                setShowRecurrenceFields(false);
                setShowDetails(false);
                onRecurrenceChange(null);
              }}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              title="Wiederholung löschen"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* Details Section - Collapsible */}
          {showDetails && (
            <div className="space-y-4 pl-4 border-l-2" style={{ borderColor: state.preferences.accentColor + '30' }}>
              {/* Pattern Selection */}
              <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              Wiederholungsmuster
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'daily', label: 'Täglich' },
                { value: 'weekly', label: 'Wöchentlich' },
                { value: 'monthly', label: 'Monatlich' },
                { value: 'yearly', label: 'Jährlich' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => handlePatternChange({ type: option.value as any })}
                  className={`px-3 py-2 text-xs rounded-lg border transition-all ${
                    recurrenceData.pattern.type === option.value
                      ? 'text-white font-medium'
                      : 'text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  style={recurrenceData.pattern.type === option.value ? getAccentColorStyles().bg : {}}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Weekly Days Selection */}
          {recurrenceData.pattern.type === 'weekly' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                Wochentage
              </label>
              <div className="grid grid-cols-7 gap-1">
                {[
                  { value: 'monday', label: 'Mo' },
                  { value: 'tuesday', label: 'Di' },
                  { value: 'wednesday', label: 'Mi' },
                  { value: 'thursday', label: 'Do' },
                  { value: 'friday', label: 'Fr' },
                  { value: 'saturday', label: 'Sa' },
                  { value: 'sunday', label: 'So' }
                ].map(day => (
                  <button
                    key={day.value}
                    onClick={() => {
                      const weekdays = recurrenceData.pattern.weekdays || [];
                      const newWeekdays = weekdays.includes(day.value as WeekDay)
                        ? weekdays.filter(d => d !== day.value)
                        : [...weekdays, day.value as WeekDay];
                      handlePatternChange({ weekdays: newWeekdays });
                    }}
                    className={`px-2 py-1 text-xs rounded border transition-all ${
                      recurrenceData.pattern.weekdays?.includes(day.value as WeekDay)
                        ? 'text-white font-medium'
                        : 'text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                    style={recurrenceData.pattern.weekdays?.includes(day.value as WeekDay) ? getAccentColorStyles().bg : {}}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Interval */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              Intervall
            </label>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Alle</span>
              <input
                type="number"
                min="1"
                max="99"
                value={recurrenceData.pattern.interval}
                onChange={(e) => handlePatternChange({ interval: parseInt(e.target.value) || 1 })}
                className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center"
                style={{ 
                  '--tw-ring-color': state.preferences.accentColor 
                } as React.CSSProperties}
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {recurrenceData.pattern.type === 'daily' ? 'Tage' :
                 recurrenceData.pattern.type === 'weekly' ? 'Wochen' :
                 recurrenceData.pattern.type === 'monthly' ? 'Monate' : 'Jahre'}
              </span>
            </div>
          </div>

          {/* Advanced Options Toggle */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              <span>Erweiterte Optionen</span>
            </button>
          </div>

          {showAdvanced && (
            <div className="space-y-3 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
              {/* Skip Weekends */}
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-600 dark:text-gray-400">
                  Wochenenden überspringen
                </label>
                <button
                  onClick={() => handlePatternChange({ skipWeekends: !recurrenceData.pattern.skipWeekends })}
                  className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                    recurrenceData.pattern.skipWeekends ? 'justify-end' : 'justify-start'
                  }`}
                  style={recurrenceData.pattern.skipWeekends ? getAccentColorStyles().bg : { backgroundColor: '#d1d5db' }}
                >
                  <span className="inline-block h-3 w-3 rounded-full bg-white shadow-lg" />
                </button>
              </div>

              {/* Skip Holidays */}
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-600 dark:text-gray-400">
                  Feiertage überspringen
                </label>
                <button
                  onClick={() => handlePatternChange({ skipHolidays: !recurrenceData.pattern.skipHolidays })}
                  className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                    recurrenceData.pattern.skipHolidays ? 'justify-end' : 'justify-start'
                  }`}
                  style={recurrenceData.pattern.skipHolidays ? getAccentColorStyles().bg : { backgroundColor: '#d1d5db' }}
                >
                  <span className="inline-block h-3 w-3 rounded-full bg-white shadow-lg" />
                </button>
              </div>

              {/* End Condition */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Endet
                </label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="end-never"
                      name="end-type"
                      checked={recurrenceData.end.type === 'never'}
                      onChange={() => handleEndChange({ type: 'never' })}
                      className="w-3 h-3"
                    />
                    <label htmlFor="end-never" className="text-xs text-gray-700 dark:text-gray-300">
                      Nie
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="end-after"
                      name="end-type"
                      checked={recurrenceData.end.type === 'after'}
                      onChange={() => handleEndChange({ type: 'after', count: 10 })}
                      className="w-3 h-3"
                    />
                    <label htmlFor="end-after" className="text-xs text-gray-700 dark:text-gray-300">
                      Nach
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="999"
                      value={recurrenceData.end.count || 10}
                      onChange={(e) => handleEndChange({ count: parseInt(e.target.value) || 10 })}
                      disabled={recurrenceData.end.type !== 'after'}
                      className="w-16 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center disabled:opacity-50"
                    />
                    <span className="text-xs text-gray-600 dark:text-gray-400">Terminen</span>
                  </div>
                </div>
              </div>
            </div>
          )}

              {/* Preview */}
              {previewDates.length > 0 && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3" style={getAccentColorStyles().bgVeryLight}>
                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar className="w-4 h-4" style={getAccentColorStyles().text} />
                    <span className="text-xs font-medium" style={getAccentColorStyles().text}>
                      Nächste Termine
                    </span>
                  </div>
                  <div className="space-y-1">
                    {previewDates.map((date, index) => (
                      <div key={index} className="text-xs text-gray-600 dark:text-gray-400">
                        {format(new Date(date), 'EEE, dd.MM.yyyy', { locale: de })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}


        </div>
      )}
    </div>
  );
} 