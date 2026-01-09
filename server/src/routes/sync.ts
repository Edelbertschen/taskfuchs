import { Hono } from 'hono';
import { prisma } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';
import type { Env } from '../types/env.js';

const app = new Hono<Env>();

app.use('*', authMiddleware);

/**
 * GET /api/sync/full
 * Get complete user data for initial sync
 */
app.get('/full', async (c) => {
  const user = c.get('user');

  // Fetch all user data in parallel
  const [
    tasks,
    columns,
    tags,
    pinColumns,
    notes,
    preferences,
    viewState,
    calendarSources,
    events,
    recurrenceRules,
    checklistItems,
    kanbanBoards
  ] = await Promise.all([
    prisma.task.findMany({
      where: { userId: user.id },
      orderBy: { position: 'asc' }
    }),
    prisma.column.findMany({
      where: { userId: user.id },
      orderBy: { order: 'asc' }
    }),
    prisma.tag.findMany({
      where: { userId: user.id },
      orderBy: { name: 'asc' }
    }),
    prisma.pinColumn.findMany({
      where: { userId: user.id },
      orderBy: { order: 'asc' }
    }),
    prisma.note.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' }
    }),
    prisma.userPreferences.findUnique({
      where: { userId: user.id }
    }),
    prisma.viewState.findUnique({
      where: { userId: user.id }
    }),
    prisma.calendarSource.findMany({
      where: { userId: user.id }
    }),
    prisma.calendarEvent.findMany({
      where: { userId: user.id },
      orderBy: { startTime: 'asc' }
    }),
    prisma.recurrenceRule.findMany({
      where: { userId: user.id }
    }),
    prisma.checklistItem.findMany({
      where: { userId: user.id }
    }),
    prisma.kanbanBoard.findMany({
      where: { userId: user.id }
    })
  ]);

  // Helper to normalize entity - use externalId as id for frontend consistency
  const normalizeEntity = (entity: any) => ({
    ...entity,
    id: entity.externalId || entity.id, // Use externalId as frontend id
    _dbId: entity.id, // Keep database id for reference
    position: entity.position !== undefined ? Number(entity.position) : undefined
  });

  // Separate archived tasks and normalize
  const activeTasks = tasks.filter(t => !t.archived).map(normalizeEntity);
  const archivedTasks = tasks.filter(t => t.archived).map(normalizeEntity);

  return c.json({
    tasks: activeTasks,
    archivedTasks,
    columns: columns.map(normalizeEntity),
    tags: tags.map(normalizeEntity),
    pinColumns: pinColumns.map(normalizeEntity),
    notes: notes.map(normalizeEntity),
    preferences: preferences?.preferences || getDefaultPreferences(),
    viewState: viewState?.state || getDefaultViewState(),
    calendarSources,
    events,
    recurrenceRules,
    checklistItems,
    kanbanBoards,
    syncedAt: new Date().toISOString()
  });
});

/**
 * POST /api/sync
 * Full sync - replace all user data
 */
app.post('/', async (c) => {
  const user = c.get('user');
  const data = await c.req.json();

  try {
    // Use transaction for atomic sync
    await prisma.$transaction(async (tx) => {
      // Delete existing data
      await tx.task.deleteMany({ where: { userId: user.id } });
      await tx.column.deleteMany({ where: { userId: user.id } });
      await tx.tag.deleteMany({ where: { userId: user.id } });
      await tx.pinColumn.deleteMany({ where: { userId: user.id } });
      await tx.note.deleteMany({ where: { userId: user.id } });
      await tx.calendarSource.deleteMany({ where: { userId: user.id } });
      await tx.calendarEvent.deleteMany({ where: { userId: user.id } });
      await tx.recurrenceRule.deleteMany({ where: { userId: user.id } });
      await tx.checklistItem.deleteMany({ where: { userId: user.id } });
      await tx.kanbanBoard.deleteMany({ where: { userId: user.id } });

      // Insert tasks (both active and archived)
      const allTasks = [
        ...(data.tasks || []),
        ...(data.archivedTasks || [])
      ];
      
      if (allTasks.length > 0) {
        await tx.task.createMany({
          data: allTasks.map((t: any) => ({
            userId: user.id,
            externalId: t.id,
            title: t.title,
            description: t.description,
            completed: t.completed || false,
            priority: t.priority || 'none',
            estimatedTime: t.estimatedTime,
            trackedTime: t.trackedTime,
            tags: t.tags || [],
            subtasks: t.subtasks || [],
            columnId: t.columnId,
            projectId: t.projectId,
            kanbanColumnId: t.kanbanColumnId,
            pinColumnId: t.pinColumnId,
            pinned: t.pinned || false,
            reminderDate: t.reminderDate,
            reminderTime: t.reminderTime,
            dueDate: t.dueDate,
            position: BigInt(t.position || Date.now()),
            archived: t.archived || false,
            completedAt: t.completedAt ? new Date(t.completedAt) : null,
            linkedNotes: t.linkedNotes || [],
            recurrenceRuleId: t.recurrenceRuleId,
            parentSeriesId: t.parentSeriesId,
            isSeriesTemplate: t.isSeriesTemplate || false,
            createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
            updatedAt: t.updatedAt ? new Date(t.updatedAt) : new Date()
          }))
        });
      }

      // Insert columns
      if (data.columns?.length > 0) {
        await tx.column.createMany({
          data: data.columns.map((col: any) => ({
            userId: user.id,
            externalId: col.id,
            title: col.title,
            type: col.type || 'date',
            date: col.date,
            order: col.order || 0,
            linkedNotes: col.linkedNotes || [],
            timebudget: col.timebudget,
            color: col.color
          }))
        });
      }

      // Insert tags
      if (data.tags?.length > 0) {
        await tx.tag.createMany({
          data: data.tags.map((tag: any) => ({
            userId: user.id,
            externalId: tag.id,
            name: tag.name,
            color: tag.color,
            count: tag.count || 0
          })),
          skipDuplicates: true
        });
      }

      // Insert pin columns
      if (data.pinColumns?.length > 0) {
        await tx.pinColumn.createMany({
          data: data.pinColumns.map((pc: any) => ({
            userId: user.id,
            externalId: pc.id,
            title: pc.title,
            color: pc.color,
            order: pc.order || 0
          }))
        });
      }

      // Insert notes
      if (data.notes?.length > 0) {
        await tx.note.createMany({
          data: data.notes.map((note: any) => ({
            userId: user.id,
            externalId: note.id,
            title: note.title,
            content: note.content || '',
            tags: note.tags || [],
            linkedTasks: note.linkedTasks || [],
            linkedNotes: note.linkedNotes || [],
            linkedProjects: note.linkedProjects || [],
            pinned: note.pinned || false,
            archived: note.archived || false,
            dailyNote: note.dailyNote || false,
            dailyNoteDate: note.dailyNoteDate,
            createdAt: note.createdAt ? new Date(note.createdAt) : new Date(),
            updatedAt: note.updatedAt ? new Date(note.updatedAt) : new Date()
          }))
        });
      }

      // Insert calendar sources
      if (data.calendarSources?.length > 0) {
        await tx.calendarSource.createMany({
          data: data.calendarSources.map((cs: any) => ({
            userId: user.id,
            name: cs.name,
            url: cs.url,
            color: cs.color || '#3b82f6',
            enabled: cs.enabled !== false,
            lastSync: cs.lastSync ? new Date(cs.lastSync) : null
          }))
        });
      }

      // Insert calendar events
      if (data.events?.length > 0) {
        await tx.calendarEvent.createMany({
          data: data.events.map((event: any) => ({
            userId: user.id,
            externalId: event.id,
            calendarUrl: event.calendarUrl,
            uid: event.uid,
            title: event.title,
            description: event.description,
            location: event.location,
            startTime: new Date(event.startTime),
            endTime: event.endTime ? new Date(event.endTime) : null,
            allDay: event.allDay || false,
            status: event.status,
            recurrence: event.recurrence,
            lastModified: event.lastModified ? new Date(event.lastModified) : null
          })),
          skipDuplicates: true
        });
      }

      // Update preferences
      if (data.preferences) {
        await tx.userPreferences.upsert({
          where: { userId: user.id },
          update: { preferences: data.preferences, updatedAt: new Date() },
          create: { userId: user.id, preferences: data.preferences }
        });
      }

      // Update view state
      if (data.viewState) {
        await tx.viewState.upsert({
          where: { userId: user.id },
          update: { state: data.viewState, updatedAt: new Date() },
          create: { userId: user.id, state: data.viewState }
        });
      }
    });

    return c.json({ success: true, syncedAt: new Date().toISOString() });
  } catch (error: any) {
    console.error('Sync error:', error);
    return c.json({ error: error.message || 'Sync failed' }, 500);
  }
});

// Default preferences
function getDefaultPreferences() {
  return {
    theme: 'light',
    language: 'de',
    accentColor: '#f97316',
    backgroundImage: '/backgrounds/bg12.webp',
    backgroundType: 'image'
  };
}

// Default view state
function getDefaultViewState() {
  return {
    currentMode: 'columns',
    kanbanGrouping: 'status',
    taskView: 'board',
    projectKanban: {
      selectedProjectId: null,
      columns: [],
      searchQuery: '',
      priorityFilters: [],
      tagFilters: [],
      showCompleted: false,
      viewType: 'board'
    }
  };
}

export default app;

