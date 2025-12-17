import { Hono } from 'hono';
import { prisma } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';
import { adminMiddleware } from '../middleware/admin.js';
import { 
  encrypt, 
  decrypt, 
  maskApiKey, 
  parseTaskWithAI, 
  parseMultipleTasksWithAI,
  testAIConnection,
  type AIContext,
  type AIParsedTask 
} from '../services/ai.js';
import type { Env } from '../types/env.js';

const app = new Hono<Env>();

// All routes require authentication
app.use('*', authMiddleware);

/**
 * GET /api/ai/settings
 * Get current AI settings (admin only)
 * API key is masked for security
 */
app.get('/settings', adminMiddleware, async (c) => {
  const settings = await prisma.aiSettings.findUnique({
    where: { id: 'global' }
  });
  
  if (!settings) {
    return c.json({ 
      settings: {
        provider: 'nebius',
        model: 'Qwen/Qwen3-235B-A22B-Instruct-2507',
        enabled: true, // Default to enabled
        baseUrl: 'https://api.studio.nebius.com/v1',
        hasApiKey: false,
        maskedApiKey: null
      }
    });
  }
  
  // Decrypt and mask the API key for display
  let maskedKey = null;
  try {
    const decrypted = decrypt(settings.apiKey);
    maskedKey = maskApiKey(decrypted);
  } catch {
    maskedKey = '(invalid key)';
  }
  
  return c.json({
    settings: {
      provider: settings.provider,
      model: settings.model,
      enabled: settings.enabled,
      baseUrl: settings.baseUrl,
      hasApiKey: true,
      maskedApiKey: maskedKey
    }
  });
});

/**
 * PUT /api/ai/settings
 * Update AI settings (admin only)
 */
app.put('/settings', adminMiddleware, async (c) => {
  const body = await c.req.json();
  const { provider, model, enabled, baseUrl, apiKey } = body;
  
  // Build update data
  const updateData: any = {};
  
  if (provider !== undefined) {
    updateData.provider = provider;
  }
  
  if (model !== undefined) {
    updateData.model = model;
  }
  
  if (enabled !== undefined) {
    updateData.enabled = Boolean(enabled);
  }
  
  if (baseUrl !== undefined) {
    updateData.baseUrl = baseUrl;
  }
  
  // Only update API key if provided (encrypt it)
  if (apiKey !== undefined && apiKey !== '') {
    updateData.apiKey = encrypt(apiKey);
  }
  
  // Upsert the settings
  const settings = await prisma.aiSettings.upsert({
    where: { id: 'global' },
    update: updateData,
    create: {
      id: 'global',
      provider: provider || 'nebius',
      model: model || 'Qwen/Qwen3-235B-A22B-Instruct-2507',
      enabled: enabled ?? false,
      baseUrl: baseUrl || 'https://api.studio.nebius.com/v1',
      apiKey: apiKey ? encrypt(apiKey) : ''
    }
  });
  
  // Return masked settings
  let maskedKey = null;
  try {
    const decrypted = decrypt(settings.apiKey);
    maskedKey = maskApiKey(decrypted);
  } catch {
    maskedKey = settings.apiKey ? '(invalid key)' : null;
  }
  
  return c.json({
    settings: {
      provider: settings.provider,
      model: settings.model,
      enabled: settings.enabled,
      baseUrl: settings.baseUrl,
      hasApiKey: Boolean(settings.apiKey),
      maskedApiKey: maskedKey
    }
  });
});

/**
 * POST /api/ai/test
 * Test the AI connection (admin only)
 */
app.post('/test', adminMiddleware, async (c) => {
  const result = await testAIConnection();
  return c.json(result);
});

/**
 * GET /api/ai/status
 * Check if AI is enabled (for all authenticated users)
 * Defaults to enabled=true if no settings exist
 */
app.get('/status', async (c) => {
  const settings = await prisma.aiSettings.findUnique({
    where: { id: 'global' }
  });
  
  return c.json({
    enabled: settings?.enabled ?? true, // Default to enabled
    model: settings?.model ?? 'Qwen/Qwen3-235B-A22B-Instruct-2507'
  });
});

/**
 * POST /api/ai/parse-task
 * Parse natural language into structured task data
 * Available to all authenticated users when AI is enabled
 */
app.post('/parse-task', async (c) => {
  const body = await c.req.json();
  const { text, projects, tags } = body;
  
  if (!text || typeof text !== 'string') {
    return c.json({ error: 'Text is required' }, 400);
  }
  
  // Build context from provided data
  const context: AIContext = {
    projects: Array.isArray(projects) ? projects : [],
    tags: Array.isArray(tags) ? tags : [],
    language: 'de' // Default to German, could be made dynamic
  };
  
  try {
    const parsed = await parseTaskWithAI(text.trim(), context);
    return c.json({ parsed });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to parse task';
    
    // Return appropriate status code based on error type
    if (message.includes('not configured') || message.includes('not enabled')) {
      return c.json({ error: message }, 503); // Service Unavailable
    }
    
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /api/ai/parse-multiple-tasks
 * Parse natural language containing multiple tasks
 * Returns an array of structured task data
 */
app.post('/parse-multiple-tasks', async (c) => {
  const body = await c.req.json();
  const { text, projects, tags, language } = body;
  
  if (!text || typeof text !== 'string') {
    return c.json({ error: 'Text is required' }, 400);
  }
  
  // Build context from provided data
  const context: AIContext = {
    projects: Array.isArray(projects) ? projects : [],
    tags: Array.isArray(tags) ? tags : [],
    language: language || 'de'
  };
  
  try {
    const tasks = await parseMultipleTasksWithAI(text.trim(), context);
    return c.json({ tasks });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to parse tasks';
    
    // Return appropriate status code based on error type
    if (message.includes('not configured') || message.includes('not enabled')) {
      return c.json({ error: message }, 503); // Service Unavailable
    }
    
    return c.json({ error: message }, 500);
  }
});

export default app;

