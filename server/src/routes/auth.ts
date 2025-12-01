import { Hono } from 'hono';
import { prisma } from '../db/client.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';
import { exchangeCodeForToken, getMicrosoftUserProfile } from '../services/microsoft.js';
import type { Env } from '../types/env.js';

const app = new Hono<Env>();

const MS_CLIENT_ID = process.env.MS_CLIENT_ID || '';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'ashik.mahmud@unique-landuse.de';

/**
 * POST /api/auth/microsoft
 * Exchange Microsoft auth code for JWT
 */
app.post('/microsoft', async (c) => {
  try {
    const { code, codeVerifier, redirectUri } = await c.req.json();

    if (!code || !codeVerifier || !redirectUri) {
      return c.json({ error: 'Missing required parameters' }, 400);
    }

    if (!MS_CLIENT_ID) {
      return c.json({ error: 'Microsoft Client ID not configured' }, 500);
    }

    // Exchange code for Microsoft access token
    const tokenResponse = await exchangeCodeForToken(
      code,
      codeVerifier,
      redirectUri,
      MS_CLIENT_ID
    );

    // Get user profile from Microsoft Graph
    const profile = await getMicrosoftUserProfile(tokenResponse.access_token);

    // Get email (prefer mail, fall back to userPrincipalName)
    const email = profile.mail || profile.userPrincipalName;

    // Find or create user in database
    let user = await prisma.user.findUnique({
      where: { microsoftId: profile.id }
    });

    if (user) {
      // Update existing user - preserve existing isAdmin status from database
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          email,
          name: profile.displayName,
          lastLoginAt: new Date(),
          updatedAt: new Date()
        }
      });
    } else {
      // Create new user - check if this is the primary admin for first-time setup
      const isAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
      
      user = await prisma.user.create({
        data: {
          microsoftId: profile.id,
          email,
          name: profile.displayName,
          isAdmin,
          language: 'de',
          lastLoginAt: new Date()
        }
      });

      // Create default preferences for new user
      await prisma.userPreferences.create({
        data: {
          userId: user.id,
          preferences: getDefaultPreferences()
        }
      });

      // Create default view state
      await prisma.viewState.create({
        data: {
          userId: user.id,
          state: getDefaultViewState()
        }
      });

      // Create default pin column
      await prisma.pinColumn.create({
        data: {
          userId: user.id,
          title: 'Fokus',
          color: '#64748b',
          order: 0
        }
      });
    }

    // Generate JWT token
    const token = generateToken(user.id, user.email, user.isAdmin);

    return c.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        isAdmin: user.isAdmin,
        language: user.language,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      }
    });
  } catch (error: any) {
    console.error('Microsoft auth error:', error);
    return c.json({ error: error.message || 'Authentication failed' }, 500);
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
app.get('/me', authMiddleware, async (c) => {
  const authUser = c.get('user');
  
  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      isAdmin: true,
      language: true,
      createdAt: true,
      lastLoginAt: true
    }
  });

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json({ user });
});

/**
 * POST /api/auth/logout
 * Logout (client should clear JWT)
 */
app.post('/logout', authMiddleware, async (c) => {
  // JWT is stateless, so just return success
  // Client should remove the token
  return c.json({ success: true });
});

// Default preferences for new users
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

// Default view state for new users
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

