import { Hono } from 'hono';
import { prisma } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';
import type { Env } from '../types/env.js';

const app = new Hono<Env>();

app.use('*', authMiddleware);

/**
 * GET /api/pin-columns
 * Get all pin columns for the authenticated user
 */
app.get('/', async (c) => {
  const user = c.get('user');

  const pinColumns = await prisma.pinColumn.findMany({
    where: { userId: user.id },
    orderBy: { order: 'asc' }
  });

  return c.json({ pinColumns });
});

/**
 * POST /api/pin-columns
 * Create a new pin column
 */
app.post('/', async (c) => {
  const user = c.get('user');
  const data = await c.req.json();

  const pinColumn = await prisma.pinColumn.create({
    data: {
      userId: user.id,
      externalId: data.id || data.externalId,
      title: data.title,
      color: data.color,
      order: data.order || 0
    }
  });

  return c.json({ pinColumn }, 201);
});

/**
 * PUT /api/pin-columns/:id
 * Update a pin column
 */
app.put('/:id', async (c) => {
  const user = c.get('user');
  const pinColumnId = c.req.param('id');
  const data = await c.req.json();

  const existing = await prisma.pinColumn.findFirst({
    where: {
      id: pinColumnId,
      userId: user.id
    }
  });

  if (!existing) {
    return c.json({ error: 'Pin column not found' }, 404);
  }

  const pinColumn = await prisma.pinColumn.update({
    where: { id: pinColumnId },
    data: {
      title: data.title,
      color: data.color,
      order: data.order,
      updatedAt: new Date()
    }
  });

  return c.json({ pinColumn });
});

/**
 * DELETE /api/pin-columns/:id
 * Delete a pin column (supports both database id and externalId)
 */
app.delete('/:id', async (c) => {
  const user = c.get('user');
  const pinColumnId = c.req.param('id');

  const existing = await prisma.pinColumn.findFirst({
    where: {
      userId: user.id,
      OR: [
        { id: pinColumnId },
        { externalId: pinColumnId }
      ]
    }
  });

  if (!existing) {
    return c.json({ error: 'Pin column not found' }, 404);
  }

  await prisma.pinColumn.delete({
    where: { id: existing.id }
  });

  return c.json({ success: true });
});

/**
 * POST /api/pin-columns/bulk
 * Bulk create/update pin columns (for sync)
 */
app.post('/bulk', async (c) => {
  const user = c.get('user');
  const { pinColumns } = await c.req.json();

  if (!Array.isArray(pinColumns)) {
    return c.json({ error: 'Pin columns must be an array' }, 400);
  }

  const results = [];

  for (const pinColumnData of pinColumns) {
    try {
      let pinColumn = pinColumnData.externalId
        ? await prisma.pinColumn.findFirst({
            where: {
              userId: user.id,
              externalId: pinColumnData.externalId
            }
          })
        : null;

      if (pinColumn) {
        pinColumn = await prisma.pinColumn.update({
          where: { id: pinColumn.id },
          data: {
            title: pinColumnData.title,
            color: pinColumnData.color,
            order: pinColumnData.order,
            updatedAt: new Date()
          }
        });
      } else {
        pinColumn = await prisma.pinColumn.create({
          data: {
            userId: user.id,
            externalId: pinColumnData.id || pinColumnData.externalId,
            title: pinColumnData.title,
            color: pinColumnData.color,
            order: pinColumnData.order || 0
          }
        });
      }

      results.push(pinColumn);
    } catch (error: any) {
      console.error('Bulk pin column error:', error);
      results.push({ error: error.message, externalId: pinColumnData.externalId || pinColumnData.id });
    }
  }

  return c.json({ pinColumns: results });
});

export default app;

