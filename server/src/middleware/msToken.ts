import { Context, Next } from 'hono';
import { prisma } from '../db/client.js';
import { refreshAccessToken } from '../services/microsoft.js';
import type { Env } from '../types/env.js';

const MS_CLIENT_ID = process.env.MS_CLIENT_ID || '';

/**
 * Middleware to ensure valid Microsoft access token for Graph API calls.
 * Automatically refreshes expired tokens using refresh_token.
 */
export async function ensureMsToken(c: Context<Env>, next: Next) {
  const authUser = c.get('user');
  
  if (!authUser?.id) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Get user with MS tokens
  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: {
      id: true,
      msAccessToken: true,
      msRefreshToken: true,
      msTokenExpiry: true
    }
  });

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  // Check if tokens exist
  if (!user.msAccessToken) {
    return c.json({ 
      error: 'Microsoft tokens not available. Please re-authenticate.',
      code: 'MS_TOKEN_MISSING'
    }, 401);
  }

  // Check if token is expired or about to expire (within 5 minutes)
  const now = new Date();
  const expiryBuffer = 5 * 60 * 1000; // 5 minutes in ms
  const isExpired = user.msTokenExpiry && user.msTokenExpiry.getTime() - expiryBuffer < now.getTime();

  if (isExpired && user.msRefreshToken) {
    try {
      // Refresh the token
      const tokenResponse = await refreshAccessToken(user.msRefreshToken, MS_CLIENT_ID);
      
      // Calculate new expiry
      const newExpiry = new Date(Date.now() + tokenResponse.expires_in * 1000);
      
      // Update tokens in database
      await prisma.user.update({
        where: { id: user.id },
        data: {
          msAccessToken: tokenResponse.access_token,
          msRefreshToken: tokenResponse.refresh_token || user.msRefreshToken,
          msTokenExpiry: newExpiry
        }
      });

      // Store refreshed token in context for this request
      c.set('msAccessToken', tokenResponse.access_token);
    } catch (error: any) {
      console.error('Failed to refresh Microsoft token:', error);
      return c.json({ 
        error: 'Microsoft token refresh failed. Please re-authenticate.',
        code: 'MS_TOKEN_REFRESH_FAILED'
      }, 401);
    }
  } else if (isExpired && !user.msRefreshToken) {
    return c.json({ 
      error: 'Microsoft token expired and no refresh token available. Please re-authenticate.',
      code: 'MS_TOKEN_EXPIRED'
    }, 401);
  } else {
    // Token is still valid
    c.set('msAccessToken', user.msAccessToken);
  }

  await next();
}

/**
 * Helper to get MS access token from context (set by ensureMsToken middleware)
 */
export function getMsAccessToken(c: Context<Env>): string | undefined {
  return c.get('msAccessToken');
}

