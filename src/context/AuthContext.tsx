import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import type { AuthState, User } from '../types';

// Extended auth state with online mode tracking
interface ExtendedAuthState extends AuthState {
  isOnlineMode: boolean;
  isAdmin: boolean;
  isRestoringSession: boolean;  // True when checking stored JWT validity on page load
  isDataLoaded: boolean;        // True when AppContext has loaded data from database
}

interface AuthContextType {
  state: ExtendedAuthState;
  loginWithMicrosoft: () => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  isGuest: () => boolean;
  setOnlineMode: (token: string, user: User) => void;
  setDataLoaded: (loaded: boolean) => void;
}

// Auth Actions
type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: Partial<User> }
  | { type: 'RESTORE_SESSION'; payload: { user: User; token: string } }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SESSION_RESTORE_START' }
  | { type: 'SESSION_RESTORE_FAILED' }
  | { type: 'SET_DATA_LOADED'; payload: boolean };

// Use VITE_API_URL if defined, otherwise empty string for same-origin (proxied) requests
const API_URL = import.meta.env.VITE_API_URL !== undefined 
  ? import.meta.env.VITE_API_URL 
  : 'http://localhost:3001';

// Auth Reducer
const authReducer = (state: ExtendedAuthState, action: AuthAction): ExtendedAuthState => {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        isLoading: true,
        error: null
      };

    case 'SESSION_RESTORE_START':
      return {
        ...state,
        isRestoringSession: true
      };

    case 'SESSION_RESTORE_FAILED':
      return {
        ...state,
        isRestoringSession: false
      };

    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        isOnlineMode: true,
        user: action.payload.user,
        token: action.payload.token,
        isAdmin: action.payload.user.isAdmin || false,
        isLoading: false,
        isRestoringSession: false,
        isDataLoaded: false, // Data will be loaded by AppContext
        error: null
      };

    case 'RESTORE_SESSION':
      return {
        ...state,
        isAuthenticated: true,
        isOnlineMode: true,
        user: action.payload.user,
        token: action.payload.token,
        isAdmin: action.payload.user.isAdmin || false,
        isLoading: false,
        isRestoringSession: false,
        isDataLoaded: false, // Data will be loaded by AppContext
        error: null
      };

    case 'LOGIN_FAILURE':
      return {
        ...state,
        isAuthenticated: false,
        isOnlineMode: false,
        user: null,
        token: undefined,
        isAdmin: false,
        isLoading: false,
        isRestoringSession: false,
        isDataLoaded: false,
        error: action.payload
      };

    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        isOnlineMode: false,
        user: null,
        token: undefined,
        isAdmin: false,
        isLoading: false,
        isRestoringSession: false,
        isDataLoaded: false,
        error: null
      };

    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };

    case 'SET_DATA_LOADED':
      return {
        ...state,
        isDataLoaded: action.payload
      };

    default:
      return state;
  }
};

// Check if there's a stored JWT on initial load
const hasStoredToken = typeof window !== 'undefined' && !!sessionStorage.getItem('taskfuchs_jwt');

// Initial State
const initialState: ExtendedAuthState = {
  isAuthenticated: false,
  isOnlineMode: false,
  isAdmin: false,
  user: null,
  isLoading: false,
  error: null,
  isRestoringSession: hasStoredToken, // True if we need to validate a stored token
  isDataLoaded: false
};

// Create Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// PKCE Helper functions
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Provider Component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Try to restore session from stored JWT on mount
  useEffect(() => {
    const restoreSession = async () => {
      const token = sessionStorage.getItem('taskfuchs_jwt');
      if (!token) {
        // No token to restore, clear restoring state
        dispatch({ type: 'SESSION_RESTORE_FAILED' });
        return;
      }

      try {
        // Validate token with backend
        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          dispatch({
            type: 'RESTORE_SESSION',
            payload: { user: data.user, token }
          });
        } else {
          // Token invalid, clear it
          sessionStorage.removeItem('taskfuchs_jwt');
          dispatch({ type: 'SESSION_RESTORE_FAILED' });
        }
      } catch (error) {
        console.error('Failed to restore session:', error);
        sessionStorage.removeItem('taskfuchs_jwt');
        dispatch({ type: 'SESSION_RESTORE_FAILED' });
      }
    };

    restoreSession();
  }, []);

  // Handle OAuth callback
  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const storedState = sessionStorage.getItem('oauth_state');
      const returnedState = urlParams.get('state');
      const codeVerifier = sessionStorage.getItem('code_verifier');

      if (code && storedState && returnedState === storedState && codeVerifier) {
    dispatch({ type: 'LOGIN_START' });

        try {
          // Exchange code for JWT via backend
          const response = await fetch(`${API_URL}/api/auth/microsoft`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              code,
              codeVerifier,
              redirectUri: `${window.location.origin}/auth/callback`
            })
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Authentication failed');
          }

          const data = await response.json();
          
          // Store JWT in sessionStorage (more secure than localStorage)
          sessionStorage.setItem('taskfuchs_jwt', data.token);
          
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: { user: data.user, token: data.token }
          });

          // Clean up URL
          window.history.replaceState({}, document.title, '/');
        } catch (error: any) {
          dispatch({
            type: 'LOGIN_FAILURE',
            payload: error.message || 'Login fehlgeschlagen'
          });
        } finally {
          // Clean up OAuth state
          sessionStorage.removeItem('oauth_state');
          sessionStorage.removeItem('code_verifier');
        }
      }
    };

    if (window.location.pathname === '/auth/callback') {
      handleCallback();
    }
  }, []);

  const loginWithMicrosoft = useCallback(async () => {
    const clientId = import.meta.env.VITE_MS_CLIENT_ID;
    if (!clientId) {
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: 'Microsoft Client ID not configured'
      });
      return;
    }

    // Generate PKCE parameters
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateCodeVerifier(); // Random state for CSRF protection

    // Store for callback
    sessionStorage.setItem('code_verifier', codeVerifier);
    sessionStorage.setItem('oauth_state', state);

    // Build authorization URL
    const redirectUri = `${window.location.origin}/auth/callback`;
    const scope = 'openid profile email User.Read';
    
    // Use tenant ID for single-tenant apps
    const tenantId = import.meta.env.VITE_MS_TENANT_ID || 'common';
    const authUrl = new URL(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('response_mode', 'query');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    // Redirect to Microsoft login
    window.location.href = authUrl.toString();
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem('taskfuchs_jwt');
    localStorage.removeItem('taskfuchs-guest-mode'); // Clear guest mode flag
    dispatch({ type: 'LOGOUT' });
    // Fire event so App.tsx can show login page
    window.dispatchEvent(new Event('auth:logout'));
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    dispatch({ type: 'UPDATE_USER', payload: updates });
  }, []);

  const isGuest = useCallback(() => {
    return !state.isOnlineMode;
  }, [state.isOnlineMode]);

  // Allow setting online mode from external auth (e.g., guest to online migration)
  const setOnlineMode = useCallback((token: string, user: User) => {
    sessionStorage.setItem('taskfuchs_jwt', token);
    dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token } });
  }, []);

  // Set data loaded state (called by AppContext when data is loaded)
  const setDataLoaded = useCallback((loaded: boolean) => {
    dispatch({ type: 'SET_DATA_LOADED', payload: loaded });
  }, []);

  // Listen for app:data-loaded event from AppContext
  useEffect(() => {
    const handleDataLoaded = () => {
      dispatch({ type: 'SET_DATA_LOADED', payload: true });
    };
    window.addEventListener('app:data-loaded', handleDataLoaded);
    return () => window.removeEventListener('app:data-loaded', handleDataLoaded);
  }, []);

  const value: AuthContextType = {
    state,
    loginWithMicrosoft,
    logout,
    updateUser,
    isGuest,
    setOnlineMode,
    setDataLoaded
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 
