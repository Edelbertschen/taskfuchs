import { Hono } from 'hono';
import { prisma } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';
import type { Env } from '../types/env.js';

const app = new Hono<Env>();

app.use('*', authMiddleware);

/**
 * GET /api/view-state
 * Get user view state
 */
app.get('/', async (c) => {
  const user = c.get('user');

  const viewState = await prisma.viewState.findUnique({
    where: { userId: user.id }
  });

  if (!viewState) {
    return c.json({ state: getDefaultViewState() });
  }

  return c.json({ state: viewState.state });
});

/**
 * PUT /api/view-state
 * Update user view state
 */
app.put('/', async (c) => {
  const user = c.get('user');
  const data = await c.req.json();

  const viewState = await prisma.viewState.upsert({
    where: { userId: user.id },
    update: {
      state: data,
      updatedAt: new Date()
    },
    create: {
      userId: user.id,
      state: data
    }
  });

  return c.json({ state: viewState.state });
});

/**
 * PATCH /api/view-state
 * Partially update view state (merge)
 */
app.patch('/', async (c) => {
  const user = c.get('user');
  const updates = await c.req.json();

  const existing = await prisma.viewState.findUnique({
    where: { userId: user.id }
  });

  const currentState = (existing?.state as Record<string, any>) || getDefaultViewState();
  const mergedState = deepMerge(currentState, updates);

  const viewState = await prisma.viewState.upsert({
    where: { userId: user.id },
    update: {
      state: mergedState,
      updatedAt: new Date()
    },
    create: {
      userId: user.id,
      state: mergedState
    }
  });

  return c.json({ state: viewState.state });
});

// Helper: Deep merge objects
function deepMerge(target: any, source: any): any {
  const output = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      output[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      output[key] = source[key];
    }
  }
  
  return output;
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

