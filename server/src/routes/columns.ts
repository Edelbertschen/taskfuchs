import { Hono } from 'hono';
import { prisma } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';
import type { Env } from '../types/env.js';

const app = new Hono<Env>();

app.use('*', authMiddleware);

/**
 * GET /api/columns
 * Get all columns for the authenticated user
 */
app.get('/', async (c) => {
  const user = c.get('user');

  const columns = await prisma.column.findMany({
    where: { userId: user.id },
    orderBy: { order: 'asc' }
  });

  return c.json({ columns });
});

/**
 * GET /api/columns/:id
 * Get a specific column
 */
app.get('/:id', async (c) => {
  const user = c.get('user');
  const columnId = c.req.param('id');

  const column = await prisma.column.findFirst({
    where: {
      id: columnId,
      userId: user.id
    }
  });

  if (!column) {
    return c.json({ error: 'Column not found' }, 404);
  }

  return c.json({ column });
});

/**
 * POST /api/columns
 * Create a new column
 */
app.post('/', async (c) => {
  const user = c.get('user');
  const data = await c.req.json();

  const column = await prisma.column.create({
    data: {
      userId: user.id,
      externalId: data.id || data.externalId,
      title: data.title,
      type: data.type || 'date',
      date: data.date,
      order: data.order || 0,
      linkedNotes: data.linkedNotes || [],
      timebudget: data.timebudget,
      color: data.color
    }
  });

  return c.json({ column }, 201);
});

/**
 * PUT /api/columns/:id
 * Update a column
 */
app.put('/:id', async (c) => {
  const user = c.get('user');
  const columnId = c.req.param('id');
  const data = await c.req.json();

  const existing = await prisma.column.findFirst({
    where: {
      id: columnId,
      userId: user.id
    }
  });

  if (!existing) {
    return c.json({ error: 'Column not found' }, 404);
  }

  const column = await prisma.column.update({
    where: { id: columnId },
    data: {
      title: data.title,
      type: data.type,
      date: data.date,
      order: data.order,
      linkedNotes: data.linkedNotes,
      timebudget: data.timebudget,
      color: data.color === undefined ? null : data.color, // Explicitly set null to clear color
      updatedAt: new Date()
    }
  });

  return c.json({ column });
});

/**
 * DELETE /api/columns/:id
 * Delete a column (supports both database id and externalId)
 */
app.delete('/:id', async (c) => {
  const user = c.get('user');
  const columnId = c.req.param('id');

  const existing = await prisma.column.findFirst({
    where: {
      userId: user.id,
      OR: [
        { id: columnId },
        { externalId: columnId }
      ]
    }
  });

  if (!existing) {
    return c.json({ error: 'Column not found' }, 404);
  }

  await prisma.column.delete({
    where: { id: existing.id }
  });

  return c.json({ success: true });
});

/**
 * PUT /api/columns/reorder
 * Reorder columns
 */
app.put('/reorder', async (c) => {
  const user = c.get('user');
  const { columnIds } = await c.req.json();

  if (!Array.isArray(columnIds)) {
    return c.json({ error: 'columnIds must be an array' }, 400);
  }

  // Update each column's order
  await Promise.all(
    columnIds.map((id: string, index: number) =>
      prisma.column.updateMany({
        where: {
          id,
          userId: user.id
        },
        data: { order: index }
      })
    )
  );

  return c.json({ success: true });
});

/**
 * POST /api/columns/bulk
 * Bulk create/update columns (for sync)
 */
app.post('/bulk', async (c) => {
  const user = c.get('user');
  const { columns } = await c.req.json();

  if (!Array.isArray(columns)) {
    return c.json({ error: 'Columns must be an array' }, 400);
  }

  const results = [];

  for (const columnData of columns) {
    try {
      let column = columnData.externalId
        ? await prisma.column.findFirst({
            where: {
              userId: user.id,
              externalId: columnData.externalId
            }
          })
        : null;

      if (column) {
        column = await prisma.column.update({
          where: { id: column.id },
          data: {
            title: columnData.title,
            type: columnData.type,
            date: columnData.date,
            order: columnData.order,
            linkedNotes: columnData.linkedNotes,
            timebudget: columnData.timebudget,
            color: columnData.color === undefined ? null : columnData.color, // Explicitly set null to clear color
            updatedAt: new Date()
          }
        });
      } else {
        column = await prisma.column.create({
          data: {
            userId: user.id,
            externalId: columnData.id || columnData.externalId,
            title: columnData.title,
            type: columnData.type || 'date',
            date: columnData.date,
            order: columnData.order || 0,
            linkedNotes: columnData.linkedNotes || [],
            timebudget: columnData.timebudget,
            color: columnData.color
          }
        });
      }

      results.push(column);
    } catch (error: any) {
      console.error('Bulk column error:', error);
      results.push({ error: error.message, externalId: columnData.externalId || columnData.id });
    }
  }

  return c.json({ columns: results });
});

export default app;

