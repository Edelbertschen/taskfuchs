import type { Task } from '../types';
import { format, addDays } from 'date-fns';

export const sampleTasks: Task[] = [
  {
    id: '1',
    title: 'Daily Stand-up Meeting',
    description: 'Teilnahme am täglichen Team-Meeting um 9:00 Uhr',
    completed: false,
    priority: 'high',
    estimatedTime: 30,
    tags: ['meeting', 'team'],
    columnId: 'today',
    reminderDate: format(new Date(), 'yyyy-MM-dd'),
    position: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    subtasks: [],
    linkedNotes: ['note-1'] // Link to meeting notes
  },
  {
    id: '2',
    title: 'Wöchentlicher Bericht',
    description: 'Erstelle und sende den wöchentlichen Projektbericht',
    completed: false,
    priority: 'medium',
    estimatedTime: 60,
    tags: ['report', 'management'],
    columnId: 'inbox',
    reminderDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    position: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    subtasks: [
      {
        id: '2-1',
        title: 'Daten sammeln',
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        estimatedTime: 20,
        tags: []
      },
      {
        id: '2-2',
        title: 'Bericht schreiben',
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        estimatedTime: 40,
        tags: []
      }
    ],
    linkedNotes: ['note-2'] // Link to project notes
  },
  {
    id: '3',
    title: 'Monatliche Backup-Überprüfung',
    description: 'Überprüfung der System-Backups und Dokumentation',
    completed: false,
    estimatedTime: 45,
    tags: ['maintenance', 'backup'],
    columnId: 'projects',
    reminderDate: format(addDays(new Date(), 28), 'yyyy-MM-dd'),
    position: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    subtasks: []
  },
  {
    id: '4',
    title: 'Code Review für Pull Request #123',
    description: '**Pull Request Details:**\n\n- Feature: User Authentication\n- Files changed: 12\n- Lines added: +245, -89\n\n### Review Checklist:\n- [ ] Code style consistency\n- [ ] Tests coverage\n- [ ] Documentation updates\n- [ ] Security considerations',
    completed: false,
    priority: 'high',
    estimatedTime: 45,
    tags: ['code-review', 'urgent'],
    columnId: 'today',
    reminderDate: format(new Date(), 'yyyy-MM-dd'),
    position: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    subtasks: [
      {
        id: '4-1',
        title: 'Review authentication logic',
        completed: false,
        estimatedTime: 20,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: []
      },
      {
        id: '4-2',
        title: 'Check test coverage',
        completed: true,
        estimatedTime: 15,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: []
      },
      {
        id: '4-3',
        title: 'Verify security measures',
        completed: false,
        estimatedTime: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: []
      }
    ],
    linkedNotes: ['note-3'] // Link to code review notes
  },
  {
    id: '5',
    title: 'Jährliche Sicherheitsschulung',
    description: 'Teilnahme an der obligatorischen Sicherheitsschulung',
    completed: false,
    priority: 'low',
    estimatedTime: 120,
    tags: ['training', 'security'],
    columnId: 'day-after',
    reminderDate: format(addDays(new Date(), 365), 'yyyy-MM-dd'),
    position: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    subtasks: []
  },
  {
    id: '6',
    title: 'Workout Session',
    description: 'Gehe ins Fitnessstudio oder mache Sport zu Hause',
    completed: false,
    estimatedTime: 90,
    tags: ['health', 'fitness'],
    columnId: 'tomorrow',
    reminderDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    position: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    subtasks: []
  },
  {
    id: '7',
    title: 'Design System dokumentieren',
    description: 'Erstelle eine umfassende Dokumentation für unser Design System mit Komponenten, Farben und Typografie.',
    completed: false,
    priority: 'medium',
    estimatedTime: 180,
    tags: ['design', 'documentation'],
    columnId: 'projects',
    reminderDate: format(addDays(new Date(), 5), 'yyyy-MM-dd'),
    position: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    subtasks: [
      {
        id: '7-1',
        title: 'Farbpalette definieren',
        completed: true,
        estimatedTime: 30,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: []
      },
      {
        id: '7-2',
        title: 'Typografie-Regeln festlegen',
        completed: true,
        estimatedTime: 45,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: []
      },
      {
        id: '7-3',
        title: 'Komponenten dokumentieren',
        completed: false,
        estimatedTime: 105,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: []
      }
    ]
  },
  {
    id: '8',
    title: 'Wochenplanung',
    description: 'Plane die Aufgaben für die kommende Woche und setze Prioritäten.',
    completed: false,
    priority: 'high',
    estimatedTime: 45,
    tags: ['planning', 'weekly'],
    columnId: 'inbox',
    reminderDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    position: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    subtasks: []
  },
  {
    id: '9',
    title: 'Teambuilding Event organisieren',
    description: 'Organisiere ein Teambuilding-Event für das nächste Quartal.',
    completed: false,
    priority: 'low',
    estimatedTime: 120,
    tags: ['team', 'event'],
    columnId: 'projects',
    reminderDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    position: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    subtasks: [
      {
        id: '9-1',
        title: 'Aktivitäten recherchieren',
        completed: false,
        estimatedTime: 30,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: []
      },
      {
        id: '9-2',
        title: 'Budget klären',
        completed: false,
        estimatedTime: 15,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: []
      },
      {
        id: '9-3',
        title: 'Terminfindung',
        completed: false,
        estimatedTime: 20,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: []
      },
      {
        id: '9-4',
        title: 'Reservierung vornehmen',
        completed: false,
        estimatedTime: 25,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: []
      },
      {
        id: '9-5',
        title: 'Einladungen versenden',
        completed: false,
        estimatedTime: 30,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: []
      }
    ]
  },
  {
    id: '10',
    title: 'Jahresende Aufräumen',
    description: 'Büro aufräumen und Unterlagen archivieren.',
    completed: false,
    priority: 'medium',
    estimatedTime: 180,
    tags: ['cleanup', 'office'],
    columnId: 'day-after',
    reminderDate: format(addDays(new Date(), 2), 'yyyy-MM-dd'),
    position: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    subtasks: []
  }
]; 