import { Hono } from 'hono';
import { prisma } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';
import { adminMiddleware } from '../middleware/admin.js';
import type { Env } from '../types/env.js';

const app = new Hono<Env>();

// All routes require authentication and admin status
app.use('*', authMiddleware);
app.use('*', adminMiddleware);

/**
 * GET /api/admin/users
 * List all users
 */
app.get('/users', async (c) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      isAdmin: true,
      language: true,
      createdAt: true,
      lastLoginAt: true,
      _count: {
        select: {
          tasks: {
            where: {
              completed: false
            }
          }
        }
      },
      columns: {
        where: {
          type: 'project'
        },
        select: {
          id: true
        }
      },
      // Get the most recent task update for "last activity"
      tasks: {
        select: {
          updatedAt: true
        },
        orderBy: {
          updatedAt: 'desc'
        },
        take: 1
      },
      // Also check notes for activity
      notes: {
        select: {
          updatedAt: true
        },
        orderBy: {
          updatedAt: 'desc'
        },
        take: 1
      }
    },
    orderBy: { lastLoginAt: 'desc' }
  });

  // Transform to include projects count and last activity
  const usersWithProjects = users.map(user => {
    // Calculate last activity from tasks, notes, or lastLoginAt
    const taskActivity = user.tasks[0]?.updatedAt;
    const noteActivity = user.notes[0]?.updatedAt;
    
    // Find the most recent activity
    const activities = [taskActivity, noteActivity, user.lastLoginAt].filter(Boolean) as Date[];
    const lastActivityAt = activities.length > 0 
      ? new Date(Math.max(...activities.map(d => new Date(d).getTime())))
      : user.lastLoginAt;

    return {
    ...user,
    _count: {
      tasks: user._count.tasks,
      projects: user.columns.length
    },
      lastActivityAt,
      columns: undefined, // Remove columns array from response
      tasks: undefined,   // Remove tasks array from response
      notes: undefined    // Remove notes array from response
    };
  });

  return c.json({ users: usersWithProjects });
});

/**
 * GET /api/admin/users/:id
 * Get detailed user info
 */
app.get('/users/:id', async (c) => {
  const userId = c.req.param('id');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      microsoftId: true,
      email: true,
      name: true,
      avatarUrl: true,
      isAdmin: true,
      language: true,
      createdAt: true,
      updatedAt: true,
      lastLoginAt: true,
      _count: {
        select: {
          tasks: true,
          notes: true,
          columns: true,
          tags: true,
          pinColumns: true,
          calendarSources: true,
          events: true,
          checklistItems: true
        }
      }
    }
  });

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json({ user });
});

/**
 * DELETE /api/admin/users/:id
 * Delete a user and all their data
 */
app.delete('/users/:id', async (c) => {
  const adminUser = c.get('user');
  const userId = c.req.param('id');

  // Prevent admin from deleting themselves
  if (userId === adminUser.id) {
    return c.json({ error: 'Cannot delete your own account' }, 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  // Delete user (cascade will delete all related data)
  await prisma.user.delete({
    where: { id: userId }
  });

  return c.json({ success: true, deleted: user.email });
});

/**
 * GET /api/admin/stats
 * Get usage statistics
 */
app.get('/stats', async (c) => {
  const [
    totalUsers,
    totalTasks,
    totalProjects,
    activeUsersLast7Days,
    activeUsersLast30Days
  ] = await Promise.all([
    prisma.user.count(),
    prisma.task.count({
      where: {
        completed: false
      }
    }),
    prisma.column.count({
      where: {
        type: 'project'
      }
    }),
    prisma.user.count({
      where: {
        lastLoginAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    }),
    prisma.user.count({
      where: {
        lastLoginAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      }
    })
  ]);

  // Get recent signups
  const recentSignups = await prisma.user.findMany({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      }
    },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  // Get top users by active task count
  const topUsers = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      _count: {
        select: { 
          tasks: {
            where: {
              completed: false
            }
          }
        }
      }
    },
    orderBy: {
      tasks: {
        _count: 'desc'
      }
    },
    take: 10
  });

  return c.json({
    stats: {
      totalUsers,
      totalTasks,
      totalProjects,
      activeUsersLast7Days,
      activeUsersLast30Days
    },
    recentSignups,
    topUsers
  });
});

/**
 * PUT /api/admin/users/:id/admin
 * Toggle admin status for a user
 */
app.put('/users/:id/admin', async (c) => {
  const adminUser = c.get('user');
  const userId = c.req.param('id');
  const { isAdmin } = await c.req.json();

  // Prevent admin from removing their own admin status
  if (userId === adminUser.id && !isAdmin) {
    return c.json({ error: 'Cannot remove your own admin status' }, 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { isAdmin }
  });

  return c.json({ 
    success: true, 
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      isAdmin: updatedUser.isAdmin
    }
  });
});

export default app;

