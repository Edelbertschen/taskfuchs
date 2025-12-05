import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { ensureMsToken, getMsAccessToken } from '../middleware/msToken.js';
import type { Env } from '../types/env.js';

const app = new Hono<Env>();

const MS_GRAPH_URL = 'https://graph.microsoft.com/v1.0';

// Apply auth middleware to all routes
app.use('*', authMiddleware);
app.use('*', ensureMsToken);

/**
 * GET /api/email/folders
 * List all mail folders
 */
app.get('/folders', async (c) => {
  const accessToken = getMsAccessToken(c);
  
  if (!accessToken) {
    return c.json({ error: 'Microsoft access token not available' }, 401);
  }

  try {
    const response = await fetch(`${MS_GRAPH_URL}/me/mailFolders?$top=50`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Graph API error (folders):', error);
      return c.json({ error: error.error?.message || 'Failed to fetch folders' }, response.status as 400 | 401 | 403 | 404 | 500);
    }

    const data = await response.json();
    
    // Transform folder data
    const folders = data.value.map((folder: any) => ({
      id: folder.id,
      displayName: folder.displayName,
      parentFolderId: folder.parentFolderId,
      childFolderCount: folder.childFolderCount,
      unreadItemCount: folder.unreadItemCount,
      totalItemCount: folder.totalItemCount
    }));

    return c.json({ folders });
  } catch (error: any) {
    console.error('Failed to fetch mail folders:', error);
    return c.json({ error: error.message || 'Failed to fetch folders' }, 500);
  }
});

/**
 * GET /api/email/messages
 * List emails from a folder (default: Inbox)
 * Query params: folderId, top (default 50), skip (default 0), search
 */
app.get('/messages', async (c) => {
  const accessToken = getMsAccessToken(c);
  
  if (!accessToken) {
    return c.json({ error: 'Microsoft access token not available' }, 401);
  }

  const folderId = c.req.query('folderId') || 'inbox';
  const top = parseInt(c.req.query('top') || '50', 10);
  const skip = parseInt(c.req.query('skip') || '0', 10);
  const search = c.req.query('search');

  try {
    let url = `${MS_GRAPH_URL}/me/mailFolders/${folderId}/messages`;
    url += `?$top=${top}&$skip=${skip}`;
    url += `&$select=id,subject,bodyPreview,from,toRecipients,receivedDateTime,isRead,hasAttachments,importance,webLink`;
    url += `&$orderby=receivedDateTime desc`;
    
    if (search) {
      url += `&$search="${encodeURIComponent(search)}"`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'outlook.body-content-type="text"'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Graph API error (messages):', error);
      return c.json({ error: error.error?.message || 'Failed to fetch messages' }, response.status as 400 | 401 | 403 | 404 | 500);
    }

    const data = await response.json();
    
    // Transform message data
    const messages = data.value.map((msg: any) => ({
      id: msg.id,
      subject: msg.subject,
      bodyPreview: msg.bodyPreview,
      from: msg.from,
      toRecipients: msg.toRecipients,
      receivedDateTime: msg.receivedDateTime,
      isRead: msg.isRead,
      hasAttachments: msg.hasAttachments,
      importance: msg.importance,
      webLink: msg.webLink
    }));

    return c.json({ 
      messages,
      nextLink: data['@odata.nextLink'] ? true : false,
      count: data['@odata.count']
    });
  } catch (error: any) {
    console.error('Failed to fetch messages:', error);
    return c.json({ error: error.message || 'Failed to fetch messages' }, 500);
  }
});

/**
 * GET /api/email/messages/:id
 * Get single email details
 */
app.get('/messages/:id', async (c) => {
  const accessToken = getMsAccessToken(c);
  const messageId = c.req.param('id');
  
  if (!accessToken) {
    return c.json({ error: 'Microsoft access token not available' }, 401);
  }

  try {
    const url = `${MS_GRAPH_URL}/me/messages/${messageId}?$select=id,subject,body,bodyPreview,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,isRead,hasAttachments,importance,webLink,conversationId`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'outlook.body-content-type="html"'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Graph API error (message):', error);
      return c.json({ error: error.error?.message || 'Failed to fetch message' }, response.status as 400 | 401 | 403 | 404 | 500);
    }

    const msg = await response.json();
    
    return c.json({ 
      message: {
        id: msg.id,
        subject: msg.subject,
        body: msg.body,
        bodyPreview: msg.bodyPreview,
        from: msg.from,
        toRecipients: msg.toRecipients,
        ccRecipients: msg.ccRecipients,
        receivedDateTime: msg.receivedDateTime,
        sentDateTime: msg.sentDateTime,
        isRead: msg.isRead,
        hasAttachments: msg.hasAttachments,
        importance: msg.importance,
        webLink: msg.webLink,
        conversationId: msg.conversationId
      }
    });
  } catch (error: any) {
    console.error('Failed to fetch message:', error);
    return c.json({ error: error.message || 'Failed to fetch message' }, 500);
  }
});

/**
 * PATCH /api/email/messages/:id
 * Update email (mark as read/unread)
 */
app.patch('/messages/:id', async (c) => {
  const accessToken = getMsAccessToken(c);
  const messageId = c.req.param('id');
  
  if (!accessToken) {
    return c.json({ error: 'Microsoft access token not available' }, 401);
  }

  try {
    const body = await c.req.json();
    const { isRead } = body;

    if (typeof isRead !== 'boolean') {
      return c.json({ error: 'isRead must be a boolean' }, 400);
    }

    const response = await fetch(`${MS_GRAPH_URL}/me/messages/${messageId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ isRead })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Graph API error (update message):', error);
      return c.json({ error: error.error?.message || 'Failed to update message' }, response.status as 400 | 401 | 403 | 404 | 500);
    }

    return c.json({ success: true, isRead });
  } catch (error: any) {
    console.error('Failed to update message:', error);
    return c.json({ error: error.message || 'Failed to update message' }, 500);
  }
});

/**
 * POST /api/email/messages/:id/move
 * Move email to another folder (e.g., archive, trash)
 */
app.post('/messages/:id/move', async (c) => {
  const accessToken = getMsAccessToken(c);
  const messageId = c.req.param('id');
  
  if (!accessToken) {
    return c.json({ error: 'Microsoft access token not available' }, 401);
  }

  try {
    const body = await c.req.json();
    const { destinationId } = body;

    if (!destinationId) {
      return c.json({ error: 'destinationId is required' }, 400);
    }

    // Map common folder names to well-known folder names
    const folderMap: Record<string, string> = {
      'archive': 'archive',
      'trash': 'deleteditems',
      'deleted': 'deleteditems',
      'junk': 'junkemail',
      'drafts': 'drafts',
      'sent': 'sentitems',
      'inbox': 'inbox'
    };

    const targetFolder = folderMap[destinationId.toLowerCase()] || destinationId;

    const response = await fetch(`${MS_GRAPH_URL}/me/messages/${messageId}/move`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ destinationId: targetFolder })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Graph API error (move message):', error);
      return c.json({ error: error.error?.message || 'Failed to move message' }, response.status as 400 | 401 | 403 | 404 | 500);
    }

    const movedMessage = await response.json();
    return c.json({ success: true, messageId: movedMessage.id });
  } catch (error: any) {
    console.error('Failed to move message:', error);
    return c.json({ error: error.message || 'Failed to move message' }, 500);
  }
});

/**
 * DELETE /api/email/messages/:id
 * Delete email (moves to Deleted Items folder)
 */
app.delete('/messages/:id', async (c) => {
  const accessToken = getMsAccessToken(c);
  const messageId = c.req.param('id');
  
  if (!accessToken) {
    return c.json({ error: 'Microsoft access token not available' }, 401);
  }

  try {
    // Move to deleted items instead of permanent delete for safety
    const response = await fetch(`${MS_GRAPH_URL}/me/messages/${messageId}/move`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ destinationId: 'deleteditems' })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Graph API error (delete message):', error);
      return c.json({ error: error.error?.message || 'Failed to delete message' }, response.status as 400 | 401 | 403 | 404 | 500);
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete message:', error);
    return c.json({ error: error.message || 'Failed to delete message' }, 500);
  }
});

export default app;

