import type { OutlookEmail } from '../types/email';
import type { Task, Column } from '../types';

/**
 * Returns the Outlook link for an email.
 * 
 * Note: Microsoft's webLink is folder-dependent and may break if the email is moved/archived.
 * Unfortunately, there's no reliable permanent Outlook email link format that survives
 * folder moves. The webLink works immediately but may need manual searching if moved.
 */
function getOutlookLink(email: OutlookEmail): string {
  return email.webLink;
}

/**
 * Converts HTML content to Markdown (simple conversion)
 * Handles common HTML elements while preserving readability
 */
function htmlToMarkdown(html: string): string {
  if (!html) return '';
  
  let text = html;
  
  // Remove style and script tags completely
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');
  
  // Handle table cells - add space/newline
  text = text.replace(/<\/td>/gi, ' ');
  text = text.replace(/<\/tr>/gi, '\n');
  text = text.replace(/<\/th>/gi, ' ');
  
  // Convert common elements to markdown
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<p[^>]*>/gi, '');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<div[^>]*>/gi, '');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<li[^>]*>/gi, '- ');
  text = text.replace(/<\/ul>/gi, '\n');
  text = text.replace(/<ul[^>]*>/gi, '');
  text = text.replace(/<\/ol>/gi, '\n');
  text = text.replace(/<ol[^>]*>/gi, '');
  
  // Bold and italic
  text = text.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  text = text.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
  text = text.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  text = text.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
  
  // Headers
  text = text.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n');
  text = text.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n');
  text = text.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n');
  
  // Links - preserve href
  text = text.replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  
  // Blockquotes
  text = text.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, content) => {
    return content.split('\n').map((line: string) => `> ${line}`).join('\n');
  });
  
  // Remove remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');
  
  // Decode HTML entities
  text = text.replace(/&nbsp;/gi, ' ');
  text = text.replace(/&amp;/gi, '&');
  text = text.replace(/&lt;/gi, '<');
  text = text.replace(/&gt;/gi, '>');
  text = text.replace(/&quot;/gi, '"');
  text = text.replace(/&#39;/gi, "'");
  text = text.replace(/&rsquo;/gi, "'");
  text = text.replace(/&lsquo;/gi, "'");
  text = text.replace(/&rdquo;/gi, '"');
  text = text.replace(/&ldquo;/gi, '"');
  text = text.replace(/&mdash;/gi, '—');
  text = text.replace(/&ndash;/gi, '–');
  text = text.replace(/&hellip;/gi, '...');
  text = text.replace(/&#\d+;/gi, ''); // Remove numeric entities
  
  // Clean up excessive whitespace but preserve line structure
  text = text.replace(/\r\n/g, '\n'); // Normalize line endings
  text = text.replace(/\n{3,}/g, '\n\n'); // Max 2 newlines
  text = text.replace(/[ \t]+/g, ' '); // Collapse horizontal whitespace
  text = text.split('\n').map(line => line.trim()).join('\n'); // Trim each line
  text = text.replace(/\n{3,}/g, '\n\n'); // Clean again after trimming
  
  return text.trim();
}

/**
 * Gets the first N lines of text, preserving empty lines for readability
 */
function getFirstLines(text: string, maxLines: number = 20): string {
  // Split and keep structure, but limit non-empty lines
  const allLines = text.split('\n');
  const result: string[] = [];
  let nonEmptyCount = 0;
  
  for (const line of allLines) {
    if (line.trim()) {
      if (nonEmptyCount >= maxLines) break;
      nonEmptyCount++;
    }
    result.push(line);
    
    // Stop if we have enough content
    if (nonEmptyCount >= maxLines) break;
  }
  
  const finalText = result.join('\n').trim();
  
  if (nonEmptyCount >= maxLines && allLines.length > result.length) {
    return finalText + '\n\n*[...]*';
  }
  return finalText;
}

/**
 * Creates a task from an Outlook email.
 * - Title: Email subject
 * - Description: Outlook link (TOP) + From + Date + Email body preview (first 20 lines as Markdown)
 * - If dropped on date column: sets dueDate to that date
 * - If dropped on inbox/other: no date
 */
export function createTaskFromEmail(
  email: OutlookEmail, 
  targetColumn?: Column
): Task {
  // Get the Outlook link (note: may break if email is moved/archived)
  const outlookLink = getOutlookLink(email);
  
  // Format sender
  const senderName = email.from.emailAddress.name || email.from.emailAddress.address;
  const senderEmail = email.from.emailAddress.address;
  
  // Format date
  const receivedDate = new Date(email.receivedDateTime).toLocaleString();
  
  // Convert email body to markdown (if available)
  let bodyMarkdown = '';
  if (email.body?.content) {
    const rawContent = email.body.contentType === 'html' 
      ? htmlToMarkdown(email.body.content)
      : email.body.content;
    bodyMarkdown = getFirstLines(rawContent, 20);
  } else if (email.bodyPreview) {
    bodyMarkdown = getFirstLines(email.bodyPreview, 20);
  }
  
  // Build description: Compact header with Outlook link, metadata, then body
  let description = `[📧 Open in Outlook](${outlookLink})

**From:** ${senderName} [${senderEmail}](mailto:${senderEmail})
**Date:** ${receivedDate}

---`;

  if (bodyMarkdown) {
    description += `

${bodyMarkdown}`;
  }

  // Determine if this is a date column (planner) or inbox
  const isDateColumn = targetColumn?.type === 'date';
  
  // Generate a unique ID for the task
  const taskId = `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  
  return {
    id: taskId,
    title: email.subject || '(No Subject)',
    description,
    completed: false,
    priority: email.importance === 'high' ? 'high' : 'none',
    tags: ['email'], // Tag to identify email-sourced tasks
    subtasks: [],
    columnId: isDateColumn && targetColumn?.id ? targetColumn.id : 'inbox',
    dueDate: isDateColumn && targetColumn?.date ? targetColumn.date : undefined,
    position: Date.now(),
    archived: false,
    pinned: false,
    linkedNotes: [],
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Extracts a display-friendly sender name from email
 */
export function getEmailSenderDisplay(email: OutlookEmail): string {
  const from = email.from?.emailAddress;
  if (!from) return 'Unknown';
  return from.name || from.address.split('@')[0];
}

/**
 * Formats the email received time in a relative or absolute format
 */
export function formatEmailTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) {
    return date.toLocaleDateString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' });
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

