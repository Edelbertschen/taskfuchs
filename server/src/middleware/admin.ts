import { Context, Next } from 'hono';

/**
 * Middleware to check if user is admin
 * Must be used after authMiddleware
 */
export async function adminMiddleware(c: Context, next: Next) {
  const user = c.get('user');
  
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  if (!user.isAdmin) {
    return c.json({ error: 'Admin access required' }, 403);
  }

  await next();
}

