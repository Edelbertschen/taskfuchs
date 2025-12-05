import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import type { 
  OutlookEmail, 
  EmailFolder, 
  EmailSidebarState, 
  EmailAction,
  EmailFoldersResponse,
  EmailMessagesResponse,
  EmailToTaskAction
} from '../types/email';
import { useAuth } from './AuthContext';

// API URL configuration
const API_URL = import.meta.env.VITE_API_URL !== undefined 
  ? import.meta.env.VITE_API_URL 
  : 'http://localhost:3001';

// Local storage key for email settings
const EMAIL_SETTINGS_KEY = 'taskfuchs_email_settings';

// Load email-to-task action from localStorage
const loadEmailToTaskAction = (): EmailToTaskAction => {
  try {
    const settings = localStorage.getItem(EMAIL_SETTINGS_KEY);
    if (settings) {
      const parsed = JSON.parse(settings);
      return parsed.emailToTaskAction || 'none';
    }
  } catch {}
  return 'none';
};

// Initial state
const initialState: EmailSidebarState = {
  isOpen: false,
  folders: [],
  selectedFolderId: 'inbox',
  messages: [],
  isLoading: false,
  error: null,
  searchQuery: '',
  hasMore: false,
  emailToTaskAction: loadEmailToTaskAction()
};

// Reducer
function emailReducer(state: EmailSidebarState, action: EmailAction): EmailSidebarState {
  switch (action.type) {
    case 'SET_OPEN':
      return { ...state, isOpen: action.payload };
    case 'SET_FOLDERS':
      return { ...state, folders: action.payload };
    case 'SET_SELECTED_FOLDER':
      return { ...state, selectedFolderId: action.payload, messages: [], hasMore: false };
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
    case 'APPEND_MESSAGES':
      return { ...state, messages: [...state.messages, ...action.payload] };
    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map(msg =>
          msg.id === action.payload.id ? { ...msg, ...action.payload.updates } : msg
        )
      };
    case 'REMOVE_MESSAGE':
      return {
        ...state,
        messages: state.messages.filter(msg => msg.id !== action.payload)
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    case 'SET_HAS_MORE':
      return { ...state, hasMore: action.payload };
    case 'SET_EMAIL_TO_TASK_ACTION':
      // Persist to localStorage
      try {
        const settings = JSON.parse(localStorage.getItem(EMAIL_SETTINGS_KEY) || '{}');
        settings.emailToTaskAction = action.payload;
        localStorage.setItem(EMAIL_SETTINGS_KEY, JSON.stringify(settings));
      } catch {}
      return { ...state, emailToTaskAction: action.payload };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

// Context type
interface EmailContextType {
  state: EmailSidebarState;
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  fetchFolders: () => Promise<void>;
  fetchMessages: (folderId?: string, append?: boolean) => Promise<void>;
  selectFolder: (folderId: string) => void;
  markAsRead: (messageId: string, isRead: boolean) => Promise<void>;
  archiveMessage: (messageId: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  refresh: () => Promise<void>;
  setEmailToTaskAction: (action: EmailToTaskAction) => void;
  performEmailToTaskAction: (messageId: string) => Promise<void>;
}

// Create context
const EmailContext = createContext<EmailContextType | undefined>(undefined);

// Helper function for API calls
async function emailAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('taskfuchs_jwt');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.message || 'Request failed');
  }

  return response.json();
}

// Provider component
export function EmailProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(emailReducer, initialState);
  const { state: authState } = useAuth();

  // Fetch folders
  const fetchFolders = useCallback(async () => {
    if (!authState.isAuthenticated) return;
    
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const data = await emailAPI<EmailFoldersResponse>('/api/email/folders');
      dispatch({ type: 'SET_FOLDERS', payload: data.folders });
    } catch (error: any) {
      console.error('Failed to fetch folders:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [authState.isAuthenticated]);

  // Fetch messages
  const fetchMessages = useCallback(async (folderId?: string, append = false) => {
    if (!authState.isAuthenticated) return;
    
    const folder = folderId || state.selectedFolderId;
    const skip = append ? state.messages.length : 0;
    
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      let url = `/api/email/messages?folderId=${folder}&top=30&skip=${skip}`;
      if (state.searchQuery) {
        url += `&search=${encodeURIComponent(state.searchQuery)}`;
      }
      
      const data = await emailAPI<EmailMessagesResponse>(url);
      
      if (append) {
        dispatch({ type: 'APPEND_MESSAGES', payload: data.messages });
      } else {
        dispatch({ type: 'SET_MESSAGES', payload: data.messages });
      }
      dispatch({ type: 'SET_HAS_MORE', payload: data.nextLink });
    } catch (error: any) {
      console.error('Failed to fetch messages:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [authState.isAuthenticated, state.selectedFolderId, state.messages.length, state.searchQuery]);

  // Toggle sidebar
  const toggleSidebar = useCallback(() => {
    dispatch({ type: 'SET_OPEN', payload: !state.isOpen });
  }, [state.isOpen]);

  const openSidebar = useCallback(() => {
    dispatch({ type: 'SET_OPEN', payload: true });
  }, []);

  const closeSidebar = useCallback(() => {
    dispatch({ type: 'SET_OPEN', payload: false });
  }, []);

  // Select folder
  const selectFolder = useCallback((folderId: string) => {
    dispatch({ type: 'SET_SELECTED_FOLDER', payload: folderId });
  }, []);

  // Mark as read/unread
  const markAsRead = useCallback(async (messageId: string, isRead: boolean) => {
    try {
      await emailAPI(`/api/email/messages/${messageId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isRead })
      });
      dispatch({ type: 'UPDATE_MESSAGE', payload: { id: messageId, updates: { isRead } } });
    } catch (error: any) {
      console.error('Failed to mark message:', error);
      throw error;
    }
  }, []);

  // Archive message
  const archiveMessage = useCallback(async (messageId: string) => {
    try {
      await emailAPI(`/api/email/messages/${messageId}/move`, {
        method: 'POST',
        body: JSON.stringify({ destinationId: 'archive' })
      });
      dispatch({ type: 'REMOVE_MESSAGE', payload: messageId });
    } catch (error: any) {
      console.error('Failed to archive message:', error);
      throw error;
    }
  }, []);

  // Delete message
  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      await emailAPI(`/api/email/messages/${messageId}`, {
        method: 'DELETE'
      });
      dispatch({ type: 'REMOVE_MESSAGE', payload: messageId });
    } catch (error: any) {
      console.error('Failed to delete message:', error);
      throw error;
    }
  }, []);

  // Set search query
  const setSearchQuery = useCallback((query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
  }, []);

  // Refresh
  const refresh = useCallback(async () => {
    await fetchMessages();
  }, [fetchMessages]);

  // Set email-to-task action
  const setEmailToTaskAction = useCallback((action: EmailToTaskAction) => {
    dispatch({ type: 'SET_EMAIL_TO_TASK_ACTION', payload: action });
  }, []);

  // Perform email-to-task action based on settings
  const performEmailToTaskAction = useCallback(async (messageId: string) => {
    const action = state.emailToTaskAction;
    
    if (action === 'none') return;
    
    try {
      if (action === 'mark_read' || action === 'archive_and_read') {
        await markAsRead(messageId, true);
      }
      
      if (action === 'archive' || action === 'archive_and_read') {
        await archiveMessage(messageId);
      }
    } catch (error) {
      console.error('Failed to perform email-to-task action:', error);
    }
  }, [state.emailToTaskAction, markAsRead, archiveMessage]);

  // Load folders when sidebar opens
  useEffect(() => {
    if (state.isOpen && state.folders.length === 0 && authState.isAuthenticated) {
      fetchFolders();
    }
  }, [state.isOpen, state.folders.length, authState.isAuthenticated, fetchFolders]);

  // Load messages when folder changes or sidebar opens
  useEffect(() => {
    if (state.isOpen && authState.isAuthenticated) {
      fetchMessages();
    }
  }, [state.isOpen, state.selectedFolderId, authState.isAuthenticated]); // Note: not including fetchMessages to avoid infinite loop

  const value: EmailContextType = {
    state,
    toggleSidebar,
    openSidebar,
    closeSidebar,
    fetchFolders,
    fetchMessages,
    selectFolder,
    markAsRead,
    archiveMessage,
    deleteMessage,
    setSearchQuery,
    refresh,
    setEmailToTaskAction,
    performEmailToTaskAction
  };

  return (
    <EmailContext.Provider value={value}>
      {children}
    </EmailContext.Provider>
  );
}

// Hook to use email context
export function useEmail() {
  const context = useContext(EmailContext);
  if (context === undefined) {
    throw new Error('useEmail must be used within an EmailProvider');
  }
  return context;
}

