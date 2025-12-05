import type { OutlookEmail } from '../types/email';
import type { Task, Column } from '../types';

/**
 * Constructs a permanent Outlook link that works regardless of which folder the email is in.
 * 
 * The problem: Microsoft Graph API's message `id` changes when an email is moved between folders.
 * The `webLink` also breaks because it contains the folder path.
 * 
 * The solution: Use the `internetMessageId` (RFC 2822 Message-ID header) which is truly immutable.
 * We create a search-based link that finds the email by its Message-ID regardless of folder.
 */
function getPermanentOutlookLink(email: OutlookEmail): string {
  // The internetMessageId is the RFC 2822 Message-ID header - truly immutable
  // Format: <unique-id@domain.com>
  if (email.internetMessageId) {
    // Use Outlook's search to find the email by its Message-ID
    // This works regardless of which folder the email is in
    const searchQuery = `messageid:${email.internetMessageId}`;
    return `https://outlook.office.com/mail/search?q=${encodeURIComponent(searchQuery)}`;
  }
  
  // Fallback: use conversationId for a conversation-based link
  if (email.conversationId) {
    return `https://outlook.office.com/mail/search?q=conversationid:${encodeURIComponent(email.conversationId)}`;
  }
  
  // Last resort: use the webLink (will break if email is moved)
  return email.webLink;
}

/**
 * Creates a task from an Outlook email.
 * - Title: Email subject
 * - Description: From, To, Subject, Date metadata + Outlook deep link (NO body content)
 * - If dropped on date column: sets dueDate to that date
 * - If dropped on inbox/other: no date
 */
export function createTaskFromEmail(
  email: OutlookEmail, 
  targetColumn?: Column
): Task {
  // Use permanent link format that works even after archiving
  const outlookLink = getPermanentOutlookLink(email);
  
  // Format recipients
  const toList = email.toRecipients
    .map(r => r.emailAddress.name || r.emailAddress.address)
    .join(', ');
  
  // Format date
  const receivedDate = new Date(email.receivedDateTime).toLocaleString();
  
  // Build description with metadata (NO body content)
  const description = `**From:** ${email.from.emailAddress.name || email.from.emailAddress.address} <${email.from.emailAddress.address}>
**To:** ${toList}
**Subject:** ${email.subject}
**Date:** ${receivedDate}

---
[📧 Open in Outlook](${outlookLink})`;

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

