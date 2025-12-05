// Microsoft Graph API email types

export interface EmailAddress {
  address: string;
  name: string;
}

export interface EmailRecipient {
  emailAddress: EmailAddress;
}

export interface EmailBody {
  contentType: 'text' | 'html';
  content: string;
}

export interface OutlookEmail {
  id: string;
  subject: string;
  bodyPreview: string;
  body?: EmailBody;
  from: EmailRecipient;
  toRecipients: EmailRecipient[];
  ccRecipients?: EmailRecipient[];
  receivedDateTime: string;
  sentDateTime?: string;
  isRead: boolean;
  hasAttachments: boolean;
  importance: 'low' | 'normal' | 'high';
  webLink: string;
  conversationId?: string;
}

export interface EmailFolder {
  id: string;
  displayName: string;
  parentFolderId?: string;
  childFolderCount: number;
  unreadItemCount: number;
  totalItemCount: number;
}

// Drag and drop item type for emails
export interface EmailDragItem {
  type: 'EMAIL';
  email: OutlookEmail;
}

// Email-to-task action - what happens when an email is added as a task
export type EmailToTaskAction = 'none' | 'mark_read' | 'archive' | 'archive_and_read';

// Email sidebar state
export interface EmailSidebarState {
  isOpen: boolean;
  folders: EmailFolder[];
  selectedFolderId: string;
  messages: OutlookEmail[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  hasMore: boolean;
  emailToTaskAction: EmailToTaskAction;
}

// Email context actions
export type EmailAction =
  | { type: 'SET_OPEN'; payload: boolean }
  | { type: 'SET_FOLDERS'; payload: EmailFolder[] }
  | { type: 'SET_SELECTED_FOLDER'; payload: string }
  | { type: 'SET_MESSAGES'; payload: OutlookEmail[] }
  | { type: 'APPEND_MESSAGES'; payload: OutlookEmail[] }
  | { type: 'UPDATE_MESSAGE'; payload: { id: string; updates: Partial<OutlookEmail> } }
  | { type: 'REMOVE_MESSAGE'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_HAS_MORE'; payload: boolean }
  | { type: 'SET_EMAIL_TO_TASK_ACTION'; payload: EmailToTaskAction }
  | { type: 'RESET' };

// API response types
export interface EmailFoldersResponse {
  folders: EmailFolder[];
}

export interface EmailMessagesResponse {
  messages: OutlookEmail[];
  nextLink: boolean;
  count?: number;
}

export interface EmailMessageResponse {
  message: OutlookEmail;
}

