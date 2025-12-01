import { Hono } from 'hono';
import { prisma } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';
import type { Env } from '../types/env.js';

const app = new Hono<Env>();

app.use('*', authMiddleware);

/**
 * GET /api/notes
 * Get all notes for the authenticated user
 */
app.get('/', async (c) => {
  const user = c.get('user');
  const includeArchived = c.req.query('includeArchived') === 'true';

  const notes = await prisma.note.findMany({
    where: {
      userId: user.id,
      ...(includeArchived ? {} : { archived: false })
    },
    orderBy: { updatedAt: 'desc' }
  });

  return c.json({ notes });
});

/**
 * GET /api/notes/:id
 * Get a specific note
 */
app.get('/:id', async (c) => {
  const user = c.get('user');
  const noteId = c.req.param('id');

  const note = await prisma.note.findFirst({
    where: {
      id: noteId,
      userId: user.id
    }
  });

  if (!note) {
    return c.json({ error: 'Note not found' }, 404);
  }

  return c.json({ note });
});

/**
 * POST /api/notes
 * Create a new note
 */
app.post('/', async (c) => {
  const user = c.get('user');
  const data = await c.req.json();

  const note = await prisma.note.create({
    data: {
      userId: user.id,
      externalId: data.id || data.externalId,
      title: data.title,
      content: data.content || '',
      tags: data.tags || [],
      linkedTasks: data.linkedTasks || [],
      linkedNotes: data.linkedNotes || [],
      linkedProjects: data.linkedProjects || [],
      pinned: data.pinned || false,
      archived: data.archived || false,
      dailyNote: data.dailyNote || false,
      dailyNoteDate: data.dailyNoteDate,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date()
    }
  });

  return c.json({ note }, 201);
});

/**
 * PUT /api/notes/:id
 * Update a note
 */
app.put('/:id', async (c) => {
  const user = c.get('user');
  const noteId = c.req.param('id');
  const data = await c.req.json();

  const existing = await prisma.note.findFirst({
    where: {
      id: noteId,
      userId: user.id
    }
  });

  if (!existing) {
    return c.json({ error: 'Note not found' }, 404);
  }

  const note = await prisma.note.update({
    where: { id: noteId },
    data: {
      title: data.title,
      content: data.content,
      tags: data.tags,
      linkedTasks: data.linkedTasks,
      linkedNotes: data.linkedNotes,
      linkedProjects: data.linkedProjects,
      pinned: data.pinned,
      archived: data.archived,
      dailyNote: data.dailyNote,
      dailyNoteDate: data.dailyNoteDate,
      updatedAt: new Date()
    }
  });

  return c.json({ note });
});

/**
 * DELETE /api/notes/:id
 * Delete a note (supports both database id and externalId)
 */
app.delete('/:id', async (c) => {
  const user = c.get('user');
  const noteId = c.req.param('id');

  const existing = await prisma.note.findFirst({
    where: {
      userId: user.id,
      OR: [
        { id: noteId },
        { externalId: noteId }
      ]
    }
  });

  if (!existing) {
    return c.json({ error: 'Note not found' }, 404);
  }

  await prisma.note.delete({
    where: { id: existing.id }
  });

  return c.json({ success: true });
});

/**
 * POST /api/notes/bulk
 * Bulk create/update notes (for sync)
 */
app.post('/bulk', async (c) => {
  const user = c.get('user');
  const { notes } = await c.req.json();

  if (!Array.isArray(notes)) {
    return c.json({ error: 'Notes must be an array' }, 400);
  }

  const results = [];

  for (const noteData of notes) {
    try {
      let note = noteData.externalId
        ? await prisma.note.findFirst({
            where: {
              userId: user.id,
              externalId: noteData.externalId
            }
          })
        : null;

      if (note) {
        note = await prisma.note.update({
          where: { id: note.id },
          data: {
            title: noteData.title,
            content: noteData.content,
            tags: noteData.tags,
            linkedTasks: noteData.linkedTasks,
            linkedNotes: noteData.linkedNotes,
            linkedProjects: noteData.linkedProjects,
            pinned: noteData.pinned,
            archived: noteData.archived,
            dailyNote: noteData.dailyNote,
            dailyNoteDate: noteData.dailyNoteDate,
            updatedAt: new Date()
          }
        });
      } else {
        note = await prisma.note.create({
          data: {
            userId: user.id,
            externalId: noteData.id || noteData.externalId,
            title: noteData.title,
            content: noteData.content || '',
            tags: noteData.tags || [],
            linkedTasks: noteData.linkedTasks || [],
            linkedNotes: noteData.linkedNotes || [],
            linkedProjects: noteData.linkedProjects || [],
            pinned: noteData.pinned || false,
            archived: noteData.archived || false,
            dailyNote: noteData.dailyNote || false,
            dailyNoteDate: noteData.dailyNoteDate,
            createdAt: noteData.createdAt ? new Date(noteData.createdAt) : new Date(),
            updatedAt: noteData.updatedAt ? new Date(noteData.updatedAt) : new Date()
          }
        });
      }

      results.push(note);
    } catch (error: any) {
      console.error('Bulk note error:', error);
      results.push({ error: error.message, externalId: noteData.externalId || noteData.id });
    }
  }

  return c.json({ notes: results });
});

export default app;

