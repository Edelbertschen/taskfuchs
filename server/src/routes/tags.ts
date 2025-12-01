import { Hono } from 'hono';
import { prisma } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';
import type { Env } from '../types/env.js';

const app = new Hono<Env>();

app.use('*', authMiddleware);

/**
 * GET /api/tags
 * Get all tags for the authenticated user
 */
app.get('/', async (c) => {
  const user = c.get('user');

  const tags = await prisma.tag.findMany({
    where: { userId: user.id },
    orderBy: { name: 'asc' }
  });

  return c.json({ tags });
});

/**
 * POST /api/tags
 * Create a new tag
 */
app.post('/', async (c) => {
  const user = c.get('user');
  const data = await c.req.json();

  // Check if tag with same name already exists
  const existing = await prisma.tag.findFirst({
    where: {
      userId: user.id,
      name: data.name
    }
  });

  if (existing) {
    return c.json({ error: 'Tag already exists', tag: existing }, 409);
  }

  const tag = await prisma.tag.create({
    data: {
      userId: user.id,
      externalId: data.id || data.externalId,
      name: data.name,
      color: data.color,
      count: data.count || 0
    }
  });

  return c.json({ tag }, 201);
});

/**
 * PUT /api/tags/:id
 * Update a tag
 */
app.put('/:id', async (c) => {
  const user = c.get('user');
  const tagId = c.req.param('id');
  const data = await c.req.json();

  const existing = await prisma.tag.findFirst({
    where: {
      id: tagId,
      userId: user.id
    }
  });

  if (!existing) {
    return c.json({ error: 'Tag not found' }, 404);
  }

  const tag = await prisma.tag.update({
    where: { id: tagId },
    data: {
      name: data.name,
      color: data.color,
      count: data.count,
      updatedAt: new Date()
    }
  });

  return c.json({ tag });
});

/**
 * DELETE /api/tags/:id
 * Delete a tag (supports both database id and externalId)
 */
app.delete('/:id', async (c) => {
  const user = c.get('user');
  const tagId = c.req.param('id');

  const existing = await prisma.tag.findFirst({
    where: {
      userId: user.id,
      OR: [
        { id: tagId },
        { externalId: tagId }
      ]
    }
  });

  if (!existing) {
    return c.json({ error: 'Tag not found' }, 404);
  }

  await prisma.tag.delete({
    where: { id: existing.id }
  });

  return c.json({ success: true });
});

/**
 * POST /api/tags/bulk
 * Bulk create/update tags (for sync)
 */
app.post('/bulk', async (c) => {
  const user = c.get('user');
  const { tags } = await c.req.json();

  if (!Array.isArray(tags)) {
    return c.json({ error: 'Tags must be an array' }, 400);
  }

  const results = [];

  for (const tagData of tags) {
    try {
      // Try to find by name (tags are unique by name per user)
      let tag = await prisma.tag.findFirst({
        where: {
          userId: user.id,
          name: tagData.name
        }
      });

      if (tag) {
        tag = await prisma.tag.update({
          where: { id: tag.id },
          data: {
            color: tagData.color,
            count: tagData.count,
            updatedAt: new Date()
          }
        });
      } else {
        tag = await prisma.tag.create({
          data: {
            userId: user.id,
            externalId: tagData.id || tagData.externalId,
            name: tagData.name,
            color: tagData.color,
            count: tagData.count || 0
          }
        });
      }

      results.push(tag);
    } catch (error: any) {
      console.error('Bulk tag error:', error);
      results.push({ error: error.message, name: tagData.name });
    }
  }

  return c.json({ tags: results });
});

export default app;

