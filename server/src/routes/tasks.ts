import { Hono } from 'hono';
import { prisma } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';
import type { Env } from '../types/env.js';

const app = new Hono<Env>();

// All routes require authentication
app.use('*', authMiddleware);

/**
 * GET /api/tasks
 * Get all tasks for the authenticated user
 */
app.get('/', async (c) => {
  const user = c.get('user');
  const includeArchived = c.req.query('includeArchived') === 'true';

  const tasks = await prisma.task.findMany({
    where: {
      userId: user.id,
      ...(includeArchived ? {} : { archived: false })
    },
    orderBy: { position: 'asc' }
  });

  // Convert BigInt position to number for JSON serialization
  const serializedTasks = tasks.map(task => ({
    ...task,
    position: Number(task.position)
  }));

  return c.json({ tasks: serializedTasks });
});

/**
 * GET /api/tasks/archived
 * Get only archived tasks
 */
app.get('/archived', async (c) => {
  const user = c.get('user');

  const tasks = await prisma.task.findMany({
    where: {
      userId: user.id,
      archived: true
    },
    orderBy: { updatedAt: 'desc' }
  });

  const serializedTasks = tasks.map(task => ({
    ...task,
    position: Number(task.position)
  }));

  return c.json({ tasks: serializedTasks });
});

/**
 * GET /api/tasks/:id
 * Get a specific task
 */
app.get('/:id', async (c) => {
  const user = c.get('user');
  const taskId = c.req.param('id');

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      userId: user.id
    }
  });

  if (!task) {
    return c.json({ error: 'Task not found' }, 404);
  }

  return c.json({ 
    task: {
      ...task,
      position: Number(task.position)
    }
  });
});

/**
 * POST /api/tasks
 * Create a new task
 */
app.post('/', async (c) => {
  const user = c.get('user');
  const data = await c.req.json();

  const task = await prisma.task.create({
    data: {
      userId: user.id,
      externalId: data.id || data.externalId,
      title: data.title,
      description: data.description,
      completed: data.completed || false,
      priority: data.priority || 'none',
      estimatedTime: data.estimatedTime,
      trackedTime: data.trackedTime,
      tags: data.tags || [],
      subtasks: data.subtasks || [],
      columnId: data.columnId,
      projectId: data.projectId,
      kanbanColumnId: data.kanbanColumnId,
      pinColumnId: data.pinColumnId,
      pinned: data.pinned || false,
      reminderDate: data.reminderDate,
      reminderTime: data.reminderTime,
      dueDate: data.dueDate,
      position: BigInt(data.position || Date.now()),
      archived: data.archived || false,
      completedAt: data.completedAt ? new Date(data.completedAt) : null,
      linkedNotes: data.linkedNotes || [],
      recurrenceRuleId: data.recurrenceRuleId,
      parentSeriesId: data.parentSeriesId,
      isSeriesTemplate: data.isSeriesTemplate || false,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date()
    }
  });

  return c.json({ 
    task: {
      ...task,
      position: Number(task.position)
    }
  }, 201);
});

/**
 * PUT /api/tasks/:id
 * Update a task
 */
app.put('/:id', async (c) => {
  const user = c.get('user');
  const taskId = c.req.param('id');
  const data = await c.req.json();

  // First check if task exists and belongs to user
  const existing = await prisma.task.findFirst({
    where: {
      id: taskId,
      userId: user.id
    }
  });

  if (!existing) {
    return c.json({ error: 'Task not found' }, 404);
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      title: data.title,
      description: data.description,
      completed: data.completed,
      priority: data.priority,
      estimatedTime: data.estimatedTime,
      trackedTime: data.trackedTime,
      tags: data.tags,
      subtasks: data.subtasks,
      columnId: data.columnId,
      projectId: data.projectId,
      kanbanColumnId: data.kanbanColumnId,
      pinColumnId: data.pinColumnId,
      pinned: data.pinned,
      reminderDate: data.reminderDate,
      reminderTime: data.reminderTime,
      dueDate: data.dueDate,
      position: data.position !== undefined ? BigInt(data.position) : undefined,
      archived: data.archived,
      completedAt: data.completedAt ? new Date(data.completedAt) : null,
      linkedNotes: data.linkedNotes,
      recurrenceRuleId: data.recurrenceRuleId,
      parentSeriesId: data.parentSeriesId,
      isSeriesTemplate: data.isSeriesTemplate,
      updatedAt: new Date()
    }
  });

  return c.json({ 
    task: {
      ...task,
      position: Number(task.position)
    }
  });
});

/**
 * DELETE /api/tasks/:id
 * Delete a task (supports both database id and externalId)
 */
app.delete('/:id', async (c) => {
  const user = c.get('user');
  const taskId = c.req.param('id');

  // First check if task exists and belongs to user (by id or externalId)
  const existing = await prisma.task.findFirst({
    where: {
      userId: user.id,
      OR: [
        { id: taskId },
        { externalId: taskId }
      ]
    }
  });

  if (!existing) {
    return c.json({ error: 'Task not found' }, 404);
  }

  await prisma.task.delete({
    where: { id: existing.id }
  });

  return c.json({ success: true });
});

/**
 * POST /api/tasks/:id/archive
 * Archive a task
 */
app.post('/:id/archive', async (c) => {
  const user = c.get('user');
  const taskId = c.req.param('id');

  const existing = await prisma.task.findFirst({
    where: {
      id: taskId,
      userId: user.id
    }
  });

  if (!existing) {
    return c.json({ error: 'Task not found' }, 404);
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      archived: true,
      updatedAt: new Date()
    }
  });

  return c.json({ 
    task: {
      ...task,
      position: Number(task.position)
    }
  });
});

/**
 * POST /api/tasks/:id/restore
 * Restore an archived task
 */
app.post('/:id/restore', async (c) => {
  const user = c.get('user');
  const taskId = c.req.param('id');

  const existing = await prisma.task.findFirst({
    where: {
      id: taskId,
      userId: user.id
    }
  });

  if (!existing) {
    return c.json({ error: 'Task not found' }, 404);
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      archived: false,
      updatedAt: new Date()
    }
  });

  return c.json({ 
    task: {
      ...task,
      position: Number(task.position)
    }
  });
});

/**
 * POST /api/tasks/bulk
 * Bulk create/update tasks (for sync)
 */
app.post('/bulk', async (c) => {
  const user = c.get('user');
  const { tasks } = await c.req.json();

  if (!Array.isArray(tasks)) {
    return c.json({ error: 'Tasks must be an array' }, 400);
  }

  const results = [];

  for (const taskData of tasks) {
    try {
      // Try to find existing task by externalId
      let task = taskData.externalId 
        ? await prisma.task.findFirst({
            where: {
              userId: user.id,
              externalId: taskData.externalId
            }
          })
        : null;

      if (task) {
        // Update existing
        task = await prisma.task.update({
          where: { id: task.id },
          data: {
            title: taskData.title,
            description: taskData.description,
            completed: taskData.completed,
            priority: taskData.priority,
            estimatedTime: taskData.estimatedTime,
            trackedTime: taskData.trackedTime,
            tags: taskData.tags,
            subtasks: taskData.subtasks,
            columnId: taskData.columnId,
            projectId: taskData.projectId,
            kanbanColumnId: taskData.kanbanColumnId,
            pinColumnId: taskData.pinColumnId,
            pinned: taskData.pinned,
            reminderDate: taskData.reminderDate,
            dueDate: taskData.dueDate,
            position: taskData.position !== undefined ? BigInt(taskData.position) : undefined,
            archived: taskData.archived,
            linkedNotes: taskData.linkedNotes,
            updatedAt: new Date()
          }
        });
      } else {
        // Create new
        task = await prisma.task.create({
          data: {
            userId: user.id,
            externalId: taskData.id || taskData.externalId,
            title: taskData.title,
            description: taskData.description,
            completed: taskData.completed || false,
            priority: taskData.priority || 'none',
            estimatedTime: taskData.estimatedTime,
            trackedTime: taskData.trackedTime,
            tags: taskData.tags || [],
            subtasks: taskData.subtasks || [],
            columnId: taskData.columnId,
            projectId: taskData.projectId,
            kanbanColumnId: taskData.kanbanColumnId,
            pinColumnId: taskData.pinColumnId,
            pinned: taskData.pinned || false,
            reminderDate: taskData.reminderDate,
            dueDate: taskData.dueDate,
            position: BigInt(taskData.position || Date.now()),
            archived: taskData.archived || false,
            linkedNotes: taskData.linkedNotes || [],
            createdAt: taskData.createdAt ? new Date(taskData.createdAt) : new Date(),
            updatedAt: taskData.updatedAt ? new Date(taskData.updatedAt) : new Date()
          }
        });
      }

      results.push({
        ...task,
        position: Number(task.position)
      });
    } catch (error: any) {
      console.error('Bulk task error:', error);
      results.push({ error: error.message, externalId: taskData.externalId || taskData.id });
    }
  }

  return c.json({ tasks: results });
});

export default app;

