import { Context, Next } from 'hono';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/client.js';

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';

export interface JWTPayload {
  userId: string;
  email: string;
  isAdmin: boolean;
  iat: number;
  exp: number;
}

export interface AuthenticatedContext extends Context {
  user?: {
    id: string;
    email: string;
    isAdmin: boolean;
  };
}

/**
 * Middleware to verify JWT token and attach user to context
 */
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'No token provided' }, 401);
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    // Verify user still exists in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, isAdmin: true }
    });

    if (!user) {
      return c.json({ error: 'User not found' }, 401);
    }

    // Attach user to context
    c.set('user', {
      id: user.id,
      email: user.email,
      isAdmin: user.isAdmin
    });

    await next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return c.json({ error: 'Token expired' }, 401);
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return c.json({ error: 'Invalid token' }, 401);
    }
    console.error('Auth middleware error:', error);
    return c.json({ error: 'Authentication failed' }, 401);
  }
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(userId: string, email: string, isAdmin: boolean): string {
  return jwt.sign(
    { userId, email, isAdmin },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

