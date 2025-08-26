import React, { useState, useMemo } from 'react';
import { 
  Repeat, 
  Plus, 
  Edit3, 
  Trash2, 
  Play, 
  Pause, 
  Calendar, 
  BarChart3, 
  Filter, 
  Search, 
  ChevronDown,
  ChevronUp,
  Eye,
  Settings,
  Clock,
  Target,
  TrendingUp,
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle,
  Zap,
  RefreshCw,
  Archive,
  MoreVertical
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { RecurringTaskInput } from './RecurringTaskInput';
import { recurrenceService } from '../../utils/recurrenceService';
import type { RecurrenceRule, RecurringTask } from '../../types';

interface RecurringTasksViewProps {
  className?: string;
}

export function RecurringTasksView({ className = '' }: RecurringTasksViewProps) {
  const { state, dispatch } = useApp();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRule, setEditingRule] = useState<RecurrenceRule | null>(null);
  const [selectedRule, setSelectedRule] = useState<RecurrenceRule | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'rules' | 'tasks'>('rules');

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

  // Filter and sort rules
  const filteredRules = useMemo(() => {
    let filtered = state.recurrence.rules;
    
    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(rule => 
        rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rule.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Filter by active/inactive
    if (!showInactive) {
      filtered = filtered.filter(rule => rule.isActive);
    }
    
    // Sort by name
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [state.recurrence.rules, searchQuery, showInactive]);

  // Get tasks for a specific rule
  const getTasksForRule = (ruleId: string) => {
    return state.recurrence.upcomingTasks.filter(task => task.recurrenceRuleId === ruleId);
  };

  // Handle rule actions
  const handleCreateRule = (rule: RecurrenceRule) => {
    dispatch({ type: 'ADD_RECURRENCE_RULE', payload: rule });
    setShowCreateModal(false);
  };

  const handleUpdateRule = (rule: RecurrenceRule) => {
    dispatch({ type: 'UPDATE_RECURRENCE_RULE', payload: rule });
    setEditingRule(null);
  };

  const handleDeleteRule = (ruleId: string) => {
    if (confirm('Möchten Sie diese wiederkehrende Aufgabe wirklich löschen?')) {
      dispatch({ type: 'DELETE_RECURRENCE_RULE', payload: ruleId });
    }
  };

  const handleToggleRule = (rule: RecurrenceRule) => {
    const updatedRule = { ...rule, isActive: !rule.isActive };
    dispatch({ type: 'UPDATE_RECURRENCE_RULE', payload: updatedRule });
  };

  const handleGenerateTasks = (ruleId: string) => {
    const rule = state.recurrence.rules.find(r => r.id === ruleId);
    if (!rule) return;

    try {
      const dates = recurrenceService.generateOccurrences(rule, new Date(), 10);
      const tasks = dates.map((date, index) => 
        recurrenceService.generateTask(rule, new Date(date), index + 1)
      );
      
      dispatch({ type: 'GENERATE_RECURRING_TASKS', payload: { ruleId, tasks } });
    } catch (error) {
      console.error('Error generating tasks:', error);
    }
  };

  const handleCompleteTask = (taskId: string) => {
    dispatch({ type: 'COMPLETE_RECURRING_TASK', payload: taskId });
  };

  const handleSkipTask = (taskId: string) => {
    dispatch({ type: 'SKIP_RECURRING_TASK', payload: taskId });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatPattern = (rule: RecurrenceRule) => {
    const { pattern } = rule;
    let description = '';
    
    switch (pattern.type) {
      case 'daily':
        description = `Alle ${pattern.interval} Tag${pattern.interval > 1 ? 'e' : ''}`;
        break;
      case 'weekly':
        description = `Alle ${pattern.interval} Woche${pattern.interval > 1 ? 'n' : ''}`;
        if (pattern.weekdays && pattern.weekdays.length > 0) {
          const weekdayNames = pattern.weekdays.map(day => {
            const names = { monday: 'Mo', tuesday: 'Di', wednesday: 'Mi', thursday: 'Do', friday: 'Fr', saturday: 'Sa', sunday: 'So' };
            return names[day];
          });
          description += ` (${weekdayNames.join(', ')})`;
        }
        break;
      case 'monthly':
        description = `Alle ${pattern.interval} Monat${pattern.interval > 1 ? 'e' : ''}`;
        if (pattern.monthlyType === 'date' && pattern.monthDay) {
          description += ` am ${pattern.monthDay}.`;
        }
        break;
      case 'yearly':
        description = `Alle ${pattern.interval} Jahr${pattern.interval > 1 ? 'e' : ''}`;
        break;
      default:
        description = 'Benutzerdefiniert';
    }
    
    return description;
  };

  const getTaskStatus = (task: RecurringTask) => {
    const today = new Date().toISOString().split('T')[0];
    if (task.scheduledDate < today) return 'overdue';
    if (task.scheduledDate === today) return 'today';
    return 'upcoming';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Wiederkehrende Aufgaben
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Verwalte automatisch wiederholende Aufgaben
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-white transition-all duration-200 hover:shadow-lg"
          style={getAccentColorStyles().bg}
        >
          <Plus className="w-4 h-4" />
          <span>Neue Regel erstellen</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Aktive Regeln</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {state.recurrence.rules.filter(r => r.isActive).length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
              <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Heute fällig</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {state.recurrence.upcomingTasks.filter(t => t.scheduledDate === new Date().toISOString().split('T')[0]).length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Überfällig</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {state.recurrence.upcomingTasks.filter(t => t.scheduledDate < new Date().toISOString().split('T')[0]).length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Abschlussrate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {state.recurrence.overallStats.averageCompletionRate}%
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Regeln suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent
                         transition-all duration-200"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="show-inactive"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <label htmlFor="show-inactive" className="text-sm text-gray-700 dark:text-gray-300">
                Inaktive anzeigen
              </label>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('rules')}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                viewMode === 'rules' 
                  ? 'text-white' 
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              style={viewMode === 'rules' ? getAccentColorStyles().bg : {}}
            >
              Regeln
            </button>
            <button
              onClick={() => setViewMode('tasks')}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                viewMode === 'tasks' 
                  ? 'text-white' 
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              style={viewMode === 'tasks' ? getAccentColorStyles().bg : {}}
            >
              Aufgaben
            </button>
          </div>
        </div>
      </div>

      {/* Rules View */}
      {viewMode === 'rules' && (
        <div className="space-y-4">
          {filteredRules.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-12 border border-gray-200 dark:border-gray-700 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <Repeat className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Keine wiederkehrenden Aufgaben
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Erstelle deine erste wiederkehrende Aufgabe, um automatisch Termine zu generieren.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-white transition-all duration-200 hover:shadow-lg"
                style={getAccentColorStyles().bg}
              >
                <Plus className="w-4 h-4" />
                <span>Erste Regel erstellen</span>
              </button>
            </div>
          ) : (
            filteredRules.map((rule) => (
              <div key={rule.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        rule.isActive ? 'text-white' : 'bg-gray-100 dark:bg-gray-700'
                      }`} style={rule.isActive ? getAccentColorStyles().bg : {}}>
                        {rule.isActive ? <Repeat className="w-6 h-6" /> : <Pause className="w-6 h-6 text-gray-400" />}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {rule.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {formatPattern(rule)}
                        </p>
                        {rule.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {rule.description}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {rule.stats.completionRate}%
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {rule.stats.totalCompleted}/{rule.stats.totalGenerated}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleToggleRule(rule)}
                          className={`p-2 rounded-lg transition-colors ${
                            rule.isActive 
                              ? 'text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20' 
                              : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                          }`}
                          title={rule.isActive ? 'Pausieren' : 'Aktivieren'}
                        >
                          {rule.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        
                        <button
                          onClick={() => handleGenerateTasks(rule.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Aufgaben generieren"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => setEditingRule(rule)}
                          className="p-2 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="Bearbeiten"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Löschen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => setExpandedRule(expandedRule === rule.id ? null : rule.id)}
                          className="p-2 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          {expandedRule === rule.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Expanded Details */}
                {expandedRule === rule.id && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-700/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3">Aufgaben-Template</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Titel:</span>
                            <span className="text-gray-900 dark:text-white">{rule.template.title}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Priorität:</span>
                            <span className="text-gray-900 dark:text-white">
                              {rule.template.priority === 'high' ? 'Hoch' :
                               rule.template.priority === 'medium' ? 'Mittel' :
                               rule.template.priority === 'low' ? 'Niedrig' : 'Keine'}
                            </span>
                          </div>
                          {rule.template.estimatedTime && (
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Geschätzte Zeit:</span>
                              <span className="text-gray-900 dark:text-white">{rule.template.estimatedTime} Min.</span>
                            </div>
                          )}
                          {rule.template.tags.length > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Tags:</span>
                              <div className="flex flex-wrap gap-1">
                                {rule.template.tags.map(tag => (
                                  <span key={tag} className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3">Anstehende Aufgaben</h4>
                        <div className="space-y-2">
                          {getTasksForRule(rule.id).slice(0, 3).map(task => {
                            const status = getTaskStatus(task);
                            return (
                              <div key={task.id} className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-gray-800">
                                <div className="flex items-center space-x-2">
                                  <div className={`w-2 h-2 rounded-full ${
                                    status === 'overdue' ? 'bg-red-500' :
                                    status === 'today' ? 'bg-blue-500' : 'bg-gray-400'
                                  }`} />
                                  <span className="text-sm text-gray-900 dark:text-white">
                                    {formatDate(task.scheduledDate)}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <button
                                    onClick={() => handleSkipTask(task.id)}
                                    className="p-1 text-gray-400 hover:text-red-500 rounded"
                                    title="Überspringen"
                                  >
                                    <XCircle className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleCompleteTask(task.id)}
                                    className="p-1 text-gray-400 hover:text-green-500 rounded"
                                    title="Abschließen"
                                  >
                                    <CheckCircle className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                          {getTasksForRule(rule.id).length === 0 && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Keine anstehenden Aufgaben
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tasks View */}
      {viewMode === 'tasks' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Alle anstehenden Aufgaben
            </h3>
            <div className="space-y-3">
              {state.recurrence.upcomingTasks.map((task) => {
                const status = getTaskStatus(task);
                const rule = state.recurrence.rules.find(r => r.id === task.recurrenceRuleId);
                
                return (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-200 ${
                      status === 'overdue' 
                        ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20' 
                        : status === 'today'
                        ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
                        : 'border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        status === 'overdue' ? 'bg-red-100 dark:bg-red-900/40' :
                        status === 'today' ? 'bg-blue-100 dark:bg-blue-900/40' :
                        'bg-gray-100 dark:bg-gray-600'
                      }`}>
                        {status === 'overdue' ? (
                          <AlertCircle className="w-5 h-5 text-red-500" />
                        ) : status === 'today' ? (
                          <Zap className="w-5 h-5 text-blue-500" />
                        ) : (
                          <Calendar className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {task.title}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {formatDate(task.scheduledDate)}
                          {rule && <span className="ml-2">• {rule.name}</span>}
                          {task.estimatedTime && task.estimatedTime > 0 && <span className="ml-2">• {task.estimatedTime}min</span>}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleSkipTask(task.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Überspringen"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleCompleteTask(task.id)}
                        className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                        title="Abschließen"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
              
              {state.recurrence.upcomingTasks.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <Calendar className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">
                    Keine anstehenden Aufgaben
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <RecurringTaskInput
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreateRule}
      />

      {/* Edit Modal */}
      {editingRule && (
        <RecurringTaskInput
          rule={editingRule}
          isOpen={true}
          onClose={() => setEditingRule(null)}
          onSave={handleUpdateRule}
          onDelete={handleDeleteRule}
        />
      )}
    </div>
  );
} 