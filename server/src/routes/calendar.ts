import { Hono } from 'hono';
import { prisma } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';
import type { Env } from '../types/env.js';

const app = new Hono<Env>();

app.use('*', authMiddleware);

// ==================
// Calendar Sources
// ==================

/**
 * GET /api/calendar/sources
 * Get all calendar sources for the authenticated user
 */
app.get('/sources', async (c) => {
  const user = c.get('user');

  const sources = await prisma.calendarSource.findMany({
    where: { userId: user.id },
    orderBy: { name: 'asc' }
  });

  return c.json({ sources });
});

/**
 * POST /api/calendar/sources
 * Create a new calendar source
 */
app.post('/sources', async (c) => {
  const user = c.get('user');
  const data = await c.req.json();

  const source = await prisma.calendarSource.create({
    data: {
      userId: user.id,
      name: data.name,
      url: data.url,
      color: data.color || '#3b82f6',
      enabled: data.enabled !== false
    }
  });

  return c.json({ source }, 201);
});

/**
 * PUT /api/calendar/sources/:id
 * Update a calendar source
 */
app.put('/sources/:id', async (c) => {
  const user = c.get('user');
  const sourceId = c.req.param('id');
  const data = await c.req.json();

  const existing = await prisma.calendarSource.findFirst({
    where: {
      id: sourceId,
      userId: user.id
    }
  });

  if (!existing) {
    return c.json({ error: 'Calendar source not found' }, 404);
  }

  const source = await prisma.calendarSource.update({
    where: { id: sourceId },
    data: {
      name: data.name,
      url: data.url,
      color: data.color,
      enabled: data.enabled,
      lastSync: data.lastSync ? new Date(data.lastSync) : undefined,
      updatedAt: new Date()
    }
  });

  return c.json({ source });
});

/**
 * DELETE /api/calendar/sources/:id
 * Delete a calendar source and its events
 */
app.delete('/sources/:id', async (c) => {
  const user = c.get('user');
  const sourceId = c.req.param('id');

  const existing = await prisma.calendarSource.findFirst({
    where: {
      id: sourceId,
      userId: user.id
    }
  });

  if (!existing) {
    return c.json({ error: 'Calendar source not found' }, 404);
  }

  // Delete associated events
  await prisma.calendarEvent.deleteMany({
    where: {
      userId: user.id,
      calendarUrl: existing.url
    }
  });

  await prisma.calendarSource.delete({
    where: { id: sourceId }
  });

  return c.json({ success: true });
});

// ==================
// Calendar Events
// ==================

/**
 * GET /api/calendar/events
 * Get all calendar events for the authenticated user
 */
app.get('/events', async (c) => {
  const user = c.get('user');
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');

  const where: any = { userId: user.id };

  if (startDate) {
    where.startTime = { gte: new Date(startDate) };
  }
  if (endDate) {
    where.endTime = { lte: new Date(endDate) };
  }

  const events = await prisma.calendarEvent.findMany({
    where,
    orderBy: { startTime: 'asc' }
  });

  return c.json({ events });
});

/**
 * POST /api/calendar/events
 * Create or update calendar events (for sync)
 */
app.post('/events', async (c) => {
  const user = c.get('user');
  const { events } = await c.req.json();

  if (!Array.isArray(events)) {
    return c.json({ error: 'Events must be an array' }, 400);
  }

  const results = [];

  for (const eventData of events) {
    try {
      // Upsert by userId + uid
      const event = await prisma.calendarEvent.upsert({
        where: {
          userId_uid: {
            userId: user.id,
            uid: eventData.uid
          }
        },
        update: {
          calendarUrl: eventData.calendarUrl,
          title: eventData.title,
          description: eventData.description,
          location: eventData.location,
          startTime: new Date(eventData.startTime),
          endTime: eventData.endTime ? new Date(eventData.endTime) : null,
          allDay: eventData.allDay || false,
          status: eventData.status,
          recurrence: eventData.recurrence,
          lastModified: eventData.lastModified ? new Date(eventData.lastModified) : null,
          updatedAt: new Date()
        },
        create: {
          userId: user.id,
          externalId: eventData.id || eventData.externalId,
          calendarUrl: eventData.calendarUrl,
          uid: eventData.uid,
          title: eventData.title,
          description: eventData.description,
          location: eventData.location,
          startTime: new Date(eventData.startTime),
          endTime: eventData.endTime ? new Date(eventData.endTime) : null,
          allDay: eventData.allDay || false,
          status: eventData.status,
          recurrence: eventData.recurrence,
          lastModified: eventData.lastModified ? new Date(eventData.lastModified) : null
        }
      });

      results.push(event);
    } catch (error: any) {
      console.error('Calendar event error:', error);
      results.push({ error: error.message, uid: eventData.uid });
    }
  }

  return c.json({ events: results });
});

/**
 * DELETE /api/calendar/events
 * Delete events by calendar URL (for re-sync)
 */
app.delete('/events', async (c) => {
  const user = c.get('user');
  const calendarUrl = c.req.query('calendarUrl');

  if (!calendarUrl) {
    return c.json({ error: 'calendarUrl parameter required' }, 400);
  }

  const result = await prisma.calendarEvent.deleteMany({
    where: {
      userId: user.id,
      calendarUrl
    }
  });

  return c.json({ deleted: result.count });
});

/**
 * POST /api/calendar/sources/bulk
 * Bulk create/update calendar sources (for sync)
 */
app.post('/sources/bulk', async (c) => {
  const user = c.get('user');
  const { sources } = await c.req.json();

  if (!Array.isArray(sources)) {
    return c.json({ error: 'Sources must be an array' }, 400);
  }

  const results = [];

  for (const sourceData of sources) {
    try {
      // Try to find by URL (unique per user)
      let source = await prisma.calendarSource.findFirst({
        where: {
          userId: user.id,
          url: sourceData.url
        }
      });

      if (source) {
        source = await prisma.calendarSource.update({
          where: { id: source.id },
          data: {
            name: sourceData.name,
            color: sourceData.color,
            enabled: sourceData.enabled,
            lastSync: sourceData.lastSync ? new Date(sourceData.lastSync) : undefined,
            updatedAt: new Date()
          }
        });
      } else {
        source = await prisma.calendarSource.create({
          data: {
            userId: user.id,
            name: sourceData.name,
            url: sourceData.url,
            color: sourceData.color || '#3b82f6',
            enabled: sourceData.enabled !== false,
            lastSync: sourceData.lastSync ? new Date(sourceData.lastSync) : undefined
          }
        });
      }

      results.push(source);
    } catch (error: any) {
      console.error('Bulk calendar source error:', error);
      results.push({ error: error.message, url: sourceData.url });
    }
  }

  return c.json({ sources: results });
});

export default app;

