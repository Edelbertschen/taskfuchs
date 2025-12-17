import OpenAI from 'openai';
import crypto from 'crypto';
import { prisma } from '../db/client.js';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get encryption key from environment variable
 * Falls back to a default key for development (NOT secure for production)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (key) {
    return Buffer.from(key, 'hex');
  }
  // Development fallback - generates consistent key from a seed
  console.warn('⚠️  ENCRYPTION_KEY not set, using development fallback (not secure for production)');
  return crypto.scryptSync('taskfuchs-dev-key', 'salt', 32);
}

/**
 * Encrypt a string using AES-256-GCM
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encryptedData (all hex)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a string encrypted with AES-256-GCM
 */
export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();
  const parts = encryptedText.split(':');
  
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Mask an API key for safe display (shows first 8 and last 4 chars)
 */
export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 12) {
    return '****';
  }
  return `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`;
}

/**
 * Context provided to AI for better parsing
 */
export interface AIContext {
  projects: string[];
  tags: string[];
  language?: 'en' | 'de';
}

/**
 * Parsed task result from AI
 */
export interface AIParsedTask {
  title: string;
  dueDate: string | null;
  estimatedTime: number | null;
  priority: 'none' | 'low' | 'medium' | 'high';
  tags: string[];
  projectName: string | null;
  description: string | null;
}

/**
 * Build the system prompt for task parsing
 */
function buildSystemPrompt(context: AIContext): string {
  const projectList = context.projects.length > 0 
    ? context.projects.join(', ') 
    : 'No projects available';
  const tagList = context.tags.length > 0 
    ? context.tags.join(', ') 
    : 'No existing tags';
  
  const lang = context.language === 'de' ? 'German' : 'English';
  
  return `You are a task parsing assistant. Extract structured data from natural language task descriptions.
The user's language preference is ${lang}, so interpret date words accordingly (e.g., "morgen" = tomorrow in German, "heute" = today).

Available projects: ${projectList}
Available tags: ${tagList}

Return ONLY valid JSON with these fields (no markdown, no explanation):
- title: string (cleaned task title without metadata like dates, times, priorities)
- dueDate: string | null (ISO 8601 format YYYY-MM-DD, interpret relative dates like "tomorrow", "next week", "morgen", "übermorgen")
- estimatedTime: number | null (in minutes, interpret "2h" as 120, "30min" as 30, "1.5 Stunden" as 90)
- priority: "none" | "low" | "medium" | "high" (interpret "!", "!!", "!!!" or words like "urgent", "wichtig", "dringend")
- tags: string[] (extract hashtags like #meeting, match existing tags when possible)
- projectName: string | null (match to available projects if mentioned with @ or by name)
- description: string | null (any additional context or notes)

Today's date is ${new Date().toISOString().split('T')[0]}.

Example input: "Call John about the project tomorrow 30min high priority #meeting @Admin"
Example output: {"title":"Call John about the project","dueDate":"${getDateOffset(1)}","estimatedTime":30,"priority":"high","tags":["meeting"],"projectName":"Admin","description":null}

Example input: "Präsentation vorbereiten übermorgen 2h !!! #arbeit"
Example output: {"title":"Präsentation vorbereiten","dueDate":"${getDateOffset(2)}","estimatedTime":120,"priority":"high","tags":["arbeit"],"projectName":null,"description":null}`;
}

/**
 * Helper to get a date offset from today
 */
function getDateOffset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Parse a task using AI
 */
export async function parseTaskWithAI(
  text: string, 
  context: AIContext
): Promise<AIParsedTask> {
  // Get AI settings
  const settings = await prisma.aiSettings.findUnique({ 
    where: { id: 'global' } 
  });
  
  if (!settings) {
    throw new Error('AI settings not configured');
  }
  
  if (!settings.enabled) {
    throw new Error('AI feature is not enabled');
  }
  
  // Decrypt the API key
  const apiKey = decrypt(settings.apiKey);
  
  // Create OpenAI client with Nebius base URL
  const client = new OpenAI({
    baseURL: settings.baseUrl,
    apiKey: apiKey
  });
  
  try {
    const response = await client.chat.completions.create({
      model: settings.model,
      messages: [
        { role: 'system', content: buildSystemPrompt(context) },
        { role: 'user', content: text }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3, // Lower temperature for more consistent parsing
      max_tokens: 500
    });
    
    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from AI');
    }
    
    // Parse and validate the response
    const parsed = JSON.parse(content) as AIParsedTask;
    
    // Ensure all required fields exist with defaults
    return {
      title: parsed.title || text,
      dueDate: parsed.dueDate || null,
      estimatedTime: typeof parsed.estimatedTime === 'number' ? parsed.estimatedTime : null,
      priority: ['none', 'low', 'medium', 'high'].includes(parsed.priority) 
        ? parsed.priority 
        : 'none',
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      projectName: parsed.projectName || null,
      description: parsed.description || null
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Failed to parse AI response as JSON');
    }
    throw error;
  }
}

/**
 * Parse multiple tasks from a single natural language input
 */
export async function parseMultipleTasksWithAI(
  text: string, 
  context: AIContext
): Promise<AIParsedTask[]> {
  // Get AI settings
  const settings = await prisma.aiSettings.findUnique({ 
    where: { id: 'global' } 
  });
  
  if (!settings) {
    throw new Error('AI settings not configured');
  }
  
  if (!settings.enabled) {
    throw new Error('AI feature is not enabled');
  }
  
  // Decrypt the API key
  const apiKey = decrypt(settings.apiKey);
  
  // Create OpenAI client with Nebius base URL
  const client = new OpenAI({
    baseURL: settings.baseUrl,
    apiKey: apiKey
  });
  
  const projectList = context.projects.length > 0 
    ? context.projects.join(', ') 
    : 'No projects available';
  const tagList = context.tags.length > 0 
    ? context.tags.join(', ') 
    : 'No existing tags';
  const lang = context.language === 'de' ? 'German' : 'English';
  
  const systemPrompt = `You are a task parsing assistant. Your job is to extract MULTIPLE separate tasks from natural language descriptions.
The user's language preference is ${lang}, so interpret date words accordingly (e.g., "morgen" = tomorrow in German, "heute" = today).

Available projects: ${projectList}
Available tags: ${tagList}

Today's date is ${new Date().toISOString().split('T')[0]}.

CRITICAL INSTRUCTIONS:
1. You MUST return a JSON object with a "tasks" key containing an ARRAY of task objects.
2. Each separate activity, action, or to-do item mentioned should be its OWN task in the array.
3. DO NOT combine multiple activities into one task - split them!
4. Look for conjunctions like "and", "also", "then", "und", "auch" that indicate separate tasks.

Each task object in the array must have:
- title: string (the specific action/task, cleaned of metadata)
- dueDate: string | null (ISO 8601 format YYYY-MM-DD)
- estimatedTime: number | null (in minutes: "2h"=120, "30min"=30, "1 hour"=60)
- priority: "none" | "low" | "medium" | "high"
- tags: string[] (extracted hashtags)
- projectName: string | null
- description: string | null

EXAMPLE INPUT: "Tomorrow I have to write the report, which is a high priority and will take an hour. On Friday, I have to change the batteries in the thermostat and turn off the printer."

EXAMPLE OUTPUT (notice 3 separate tasks):
{
  "tasks": [
    {"title": "Write the report", "dueDate": "${getDateOffset(1)}", "estimatedTime": 60, "priority": "high", "tags": [], "projectName": null, "description": null},
    {"title": "Change the batteries in the thermostat", "dueDate": "${getDateOffset(5)}", "estimatedTime": null, "priority": "none", "tags": [], "projectName": null, "description": null},
    {"title": "Turn off the printer", "dueDate": "${getDateOffset(5)}", "estimatedTime": null, "priority": "none", "tags": [], "projectName": null, "description": null}
  ]
}

Remember: ALWAYS return {"tasks": [...]} with MULTIPLE task objects when the input describes multiple activities!`;

  try {
    const response = await client.chat.completions.create({
      model: settings.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 2000
    });
    
    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from AI');
    }
    
    // Parse the response - it might be an array or an object with a tasks array
    let parsed = JSON.parse(content);
    
    // Handle different response formats
    let tasks: AIParsedTask[];
    if (Array.isArray(parsed)) {
      tasks = parsed;
    } else if (parsed.tasks && Array.isArray(parsed.tasks)) {
      tasks = parsed.tasks;
    } else {
      // Single task object
      tasks = [parsed];
    }
    
    // Validate and normalize each task
    return tasks.map(task => ({
      title: task.title || 'Untitled Task',
      dueDate: task.dueDate || null,
      estimatedTime: typeof task.estimatedTime === 'number' ? task.estimatedTime : null,
      priority: ['none', 'low', 'medium', 'high'].includes(task.priority) 
        ? task.priority 
        : 'none',
      tags: Array.isArray(task.tags) ? task.tags : [],
      projectName: task.projectName || null,
      description: task.description || null
    }));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Failed to parse AI response as JSON');
    }
    throw error;
  }
}

/**
 * Test the AI connection with a simple request
 */
export async function testAIConnection(): Promise<{ success: boolean; message: string }> {
  const settings = await prisma.aiSettings.findUnique({ 
    where: { id: 'global' } 
  });
  
  if (!settings) {
    return { success: false, message: 'AI settings not configured' };
  }
  
  try {
    const apiKey = decrypt(settings.apiKey);
    
    const client = new OpenAI({
      baseURL: settings.baseUrl,
      apiKey: apiKey
    });
    
    // Make a minimal test request
    const response = await client.chat.completions.create({
      model: settings.model,
      messages: [
        { role: 'user', content: 'Reply with just the word "OK"' }
      ],
      max_tokens: 10
    });
    
    if (response.choices[0]?.message?.content) {
      return { success: true, message: `Connection successful. Model: ${settings.model}` };
    }
    
    return { success: false, message: 'No response from AI' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, message: `Connection failed: ${message}` };
  }
}

