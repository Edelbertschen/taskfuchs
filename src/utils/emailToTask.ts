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
  // Get the Outlook link (note: may break if email is moved/archived)
  const outlookLink = getOutlookLink(email);
  
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

