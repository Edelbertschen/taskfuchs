import { Hono } from 'hono';
import { prisma } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';
import type { Env } from '../types/env.js';

const app = new Hono<Env>();

app.use('*', authMiddleware);

/**
 * GET /api/preferences
 * Get user preferences
 */
app.get('/', async (c) => {
  const user = c.get('user');

  const userPreferences = await prisma.userPreferences.findUnique({
    where: { userId: user.id }
  });

  if (!userPreferences) {
    // Return default preferences if none exist
    return c.json({ preferences: getDefaultPreferences() });
  }

  return c.json({ preferences: userPreferences.preferences });
});

/**
 * PUT /api/preferences
 * Update user preferences
 */
app.put('/', async (c) => {
  const user = c.get('user');
  const data = await c.req.json();

  const userPreferences = await prisma.userPreferences.upsert({
    where: { userId: user.id },
    update: {
      preferences: data,
      updatedAt: new Date()
    },
    create: {
      userId: user.id,
      preferences: data
    }
  });

  return c.json({ preferences: userPreferences.preferences });
});

/**
 * PATCH /api/preferences
 * Partially update user preferences (merge)
 */
app.patch('/', async (c) => {
  const user = c.get('user');
  const updates = await c.req.json();

  const existing = await prisma.userPreferences.findUnique({
    where: { userId: user.id }
  });

  const currentPrefs = (existing?.preferences as Record<string, any>) || getDefaultPreferences();
  const mergedPrefs = deepMerge(currentPrefs, updates);

  const userPreferences = await prisma.userPreferences.upsert({
    where: { userId: user.id },
    update: {
      preferences: mergedPrefs,
      updatedAt: new Date()
    },
    create: {
      userId: user.id,
      preferences: mergedPrefs
    }
  });

  return c.json({ preferences: userPreferences.preferences });
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

// Default preferences
function getDefaultPreferences() {
  return {
    theme: 'light',
    language: 'de',
    accentColor: '#f97316',
    backgroundImage: '/backgrounds/bg12.webp',
    backgroundType: 'image',
    dateFormat: 'dd.MM.yyyy',
    recentBackgroundImages: [],
    notifications: {
      email: true,
      push: true,
      timerReminders: true,
      deadlineReminders: true
    },
    privacy: {
      analytics: false,
      crashReports: true
    },
    sounds: true,
    soundVolume: 0.8,
    completionSound: 'yeah',
    completionSoundEnabled: true,
    enableCelebration: true,
    celebrationText: 'Gut gemacht!',
    celebrationDuration: 3000,
    timerDisplayMode: 'topBar',
    columns: {
      visible: 5,
      plannerVisible: 5,
      projectsVisible: 5,
      pinsVisible: 5,
      showProjects: true
    },
    showPriorities: true,
    sidebar: {
      hiddenItems: [],
      itemOrder: ['today', 'inbox', 'tasks', 'kanban', 'notes', 'tags', 'statistics', 'archive']
    },
    enableEndOfDay: true,
    timer: {
      showOverlay: true,
      overlayPosition: { x: 100, y: 80 },
      overlayMinimized: false,
      autoOpenTaskOnStart: true,
      showRemainingTime: true,
      dimControlsWhenNoTask: false,
      soundEnabled: true,
      taskSound: 'yeah',
      whiteNoiseEnabled: false,
      whiteNoiseType: 'clock',
      whiteNoiseVolume: 0.3
    },
    backgroundEffects: {
      blur: false,
      overlay: false,
      overlayOpacity: 0.4
    }
  };
}

export default app;

