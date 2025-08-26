import React, { useState, useEffect } from 'react';
import { Clock, Bell, Plus, X, Edit2, Calendar, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Task, TaskReminder } from '../../types';
import { format, addMinutes, addHours, addDays } from 'date-fns';

interface ReminderManagerProps {
  task: Task;
  onUpdate: (task: Task) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function ReminderManager({ task, onUpdate, isOpen, onClose }: ReminderManagerProps) {
  const { state } = useApp();
  const [reminders, setReminders] = useState<TaskReminder[]>(task.reminders || []);
  const [isAddingReminder, setIsAddingReminder] = useState(false);
  const [newReminderDate, setNewReminderDate] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('09:00');
  const [newReminderMessage, setNewReminderMessage] = useState('');

  const accentColor = state.preferences.accentColor || '#0ea5e9';

  useEffect(() => {
    setReminders(task.reminders || []);
  }, [task.reminders]);

  const addQuickReminder = (type: '15min' | '1hour' | '1day' | 'custom') => {
    const now = new Date();
    let reminderDateTime: Date;

    switch (type) {
      case '15min':
        reminderDateTime = addMinutes(now, 15);
        break;
      case '1hour':
        reminderDateTime = addHours(now, 1);
        break;
      case '1day':
        reminderDateTime = addDays(now, 1);
        break;
      case 'custom':
        setIsAddingReminder(true);
        setNewReminderDate(format(now, 'yyyy-MM-dd'));
        setNewReminderTime(format(now, 'HH:mm'));
        setNewReminderMessage(`Erinnerung: ${task.title}`);
        return;
    }

    const newReminder: TaskReminder = {
      id: `reminder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date: format(reminderDateTime, 'yyyy-MM-dd'),
      time: format(reminderDateTime, 'HH:mm'),
      message: `Erinnerung: ${task.title}`,
      type: 'manual',
      dismissed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedReminders = [...reminders, newReminder];
    setReminders(updatedReminders);
    updateTaskReminders(updatedReminders);
  };

  const addCustomReminder = () => {
    if (!newReminderDate || !newReminderTime) return;

    const newReminder: TaskReminder = {
      id: `reminder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date: newReminderDate,
      time: newReminderTime,
      message: newReminderMessage || `Erinnerung: ${task.title}`,
      type: 'manual',
      dismissed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedReminders = [...reminders, newReminder];
    setReminders(updatedReminders);
    updateTaskReminders(updatedReminders);
    setIsAddingReminder(false);
    setNewReminderDate('');
    setNewReminderTime('09:00');
    setNewReminderMessage('');
  };

  const removeReminder = (reminderId: string) => {
    const updatedReminders = reminders.filter(r => r.id !== reminderId);
    setReminders(updatedReminders);
    updateTaskReminders(updatedReminders);
  };

  const updateTaskReminders = (updatedReminders: TaskReminder[]) => {
    const updatedTask = {
      ...task,
      reminders: updatedReminders,
      updatedAt: new Date().toISOString()
    };
    onUpdate(updatedTask);
  };

  const dismissReminder = (reminderId: string) => {
    const updatedReminders = reminders.map(r => 
      r.id === reminderId ? { ...r, dismissed: true, updatedAt: new Date().toISOString() } : r
    );
    setReminders(updatedReminders);
    updateTaskReminders(updatedReminders);
  };

  const snoozeReminder = (reminderId: string, minutes: number) => {
    const snoozeUntil = addMinutes(new Date(), minutes).toISOString();
    const updatedReminders = reminders.map(r => 
      r.id === reminderId ? { ...r, snoozedUntil: snoozeUntil, updatedAt: new Date().toISOString() } : r
    );
    setReminders(updatedReminders);
    updateTaskReminders(updatedReminders);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999999999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700"
             style={{ backgroundColor: `${accentColor}10` }}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ backgroundColor: accentColor }}>
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Erinnerungen verwalten
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {task.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* Quick Add Buttons */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Schnell hinzufügen
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <button
                onClick={() => addQuickReminder('15min')}
                className="p-3 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                In 15 Min
              </button>
              <button
                onClick={() => addQuickReminder('1hour')}
                className="p-3 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                In 1 Stunde
              </button>
              <button
                onClick={() => addQuickReminder('1day')}
                className="p-3 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Morgen
              </button>
              <button
                onClick={() => addQuickReminder('custom')}
                className="p-3 text-sm flex items-center justify-center space-x-2 text-white rounded-lg transition-colors"
                style={{ backgroundColor: accentColor }}
              >
                <Plus className="w-4 h-4" />
                <span>Benutzerdefiniert</span>
              </button>
            </div>
          </div>

          {/* Custom Reminder Form */}
          {isAddingReminder && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Neue Erinnerung
              </h4>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Datum
                    </label>
                    <input
                      type="date"
                      value={newReminderDate}
                      onChange={(e) => setNewReminderDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Uhrzeit
                    </label>
                    <input
                      type="time"
                      value={newReminderTime}
                      onChange={(e) => setNewReminderTime(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Nachricht (optional)
                  </label>
                  <input
                    type="text"
                    value={newReminderMessage}
                    onChange={(e) => setNewReminderMessage(e.target.value)}
                    placeholder={`Erinnerung: ${task.title}`}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={addCustomReminder}
                    className="px-4 py-2 text-sm text-white rounded-md transition-colors"
                    style={{ backgroundColor: accentColor }}
                  >
                    Hinzufügen
                  </button>
                  <button
                    onClick={() => setIsAddingReminder(false)}
                    className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Existing Reminders */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Aktive Erinnerungen ({reminders.filter(r => !r.dismissed).length})
            </h3>
            
            {reminders.filter(r => !r.dismissed).length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Keine aktiven Erinnerungen</p>
                <p className="text-sm">Fügen Sie eine Erinnerung hinzu, um benachrichtigt zu werden.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {reminders
                  .filter(r => !r.dismissed)
                  .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
                  .map((reminder) => (
                    <div
                      key={reminder.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {format(new Date(reminder.date), 'dd.MM.yyyy')}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {reminder.time}
                          </span>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          reminder.type === 'todoist' 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                            : reminder.type === 'auto'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                        }`}>
                          {reminder.type === 'todoist' ? 'Todoist' : 
                           reminder.type === 'auto' ? 'Auto' : 'Manuell'}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        {reminder.snoozedUntil && new Date(reminder.snoozedUntil) > new Date() && (
                          <span className="text-xs text-yellow-600 dark:text-yellow-400 mr-2">
                            Geschlummert
                          </span>
                        )}
                        <button
                          onClick={() => snoozeReminder(reminder.id, 15)}
                          className="p-1 text-gray-400 hover:text-yellow-500 rounded transition-colors"
                          title="15 Min schlummern"
                        >
                          <Clock className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => dismissReminder(reminder.id)}
                          className="p-1 text-gray-400 hover:text-green-500 rounded transition-colors"
                          title="Als erledigt markieren"
                        >
                          <Bell className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeReminder(reminder.id)}
                          className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                          title="Erinnerung löschen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              💡 Erinnerungen funktionieren unabhängig vom Aufgabendatum
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-white rounded-lg transition-colors"
              style={{ backgroundColor: accentColor }}
            >
              Fertig
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 