import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { AuthState, User } from '../types';
import { supabase } from '../lib/supabaseClient';
import { uploadInitialBackupIfNeeded, tryRestoreFromBackup } from '../utils/supabaseSync';

interface AuthContextType {
  state: AuthState;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  isGuest: () => boolean;
}

// Auth Actions
type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'REGISTER_START' }
  | { type: 'REGISTER_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'REGISTER_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: Partial<User> }
  | { type: 'RESTORE_SESSION'; payload: { user: User; token: string } }
  | { type: 'CLEAR_ERROR' };

// Auth Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_START':
    case 'REGISTER_START':
      return {
        ...state,
        isLoading: true,
        error: null
      };

    case 'LOGIN_SUCCESS':
    case 'REGISTER_SUCCESS':
    case 'RESTORE_SESSION':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        isLoading: false,
        error: null
      };

    case 'LOGIN_FAILURE':
    case 'REGISTER_FAILURE':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: undefined,
        isLoading: false,
        error: action.payload
      };

    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: undefined,
        isLoading: false,
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

    default:
      return state;
  }
};

// Initial State
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  isLoading: false,
  error: null
};

// Create Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider Component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Restore session via Supabase and listen for changes
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!supabase) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        if (session?.user) {
          const user: User = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.email || 'User',
            avatar: session.user.user_metadata?.avatar_url,
            createdAt: session.user.created_at || new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
            profiles: [],
            activeProfileId: undefined,
            preferences: undefined as any
          } as any;
          dispatch({ type: 'RESTORE_SESSION', payload: { user, token: session.access_token } });
          // Ensure initial backup also when session is auto-restored
          uploadInitialBackupIfNeeded(user.id).catch(() => {});
          // Try initial restore on fresh devices (no local data yet)
          tryRestoreFromBackup(user.id).then((restored) => {
            if (restored) {
              // Reload to let app load newly restored local data
              window.location.reload();
            }
          }).catch(() => {});
        }
      } catch (e) {
        // ignore
      }
    })();

    if (!supabase) return () => {};
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const user: User = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || session.user.email || 'User',
          avatar: session.user.user_metadata?.avatar_url,
          createdAt: session.user.created_at || new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          profiles: [],
          activeProfileId: undefined,
          preferences: undefined as any
        } as any;
        dispatch({ type: 'RESTORE_SESSION', payload: { user, token: session.access_token } });
        uploadInitialBackupIfNeeded(user.id).catch(() => {});
        tryRestoreFromBackup(user.id).then((restored) => {
          if (restored) window.location.reload();
        }).catch(() => {});
      } else {
        dispatch({ type: 'LOGOUT' });
      }
    });
    return () => { mounted = false; sub?.subscription?.unsubscribe(); };
  }, []);

  // Save token and user to localStorage when authenticated
  useEffect(() => {
    if (state.isAuthenticated && state.user && state.token) {
      localStorage.setItem('taskfuchs_token', state.token);
      localStorage.setItem('taskfuchs_user', JSON.stringify(state.user));
    } else {
      localStorage.removeItem('taskfuchs_token');
      localStorage.removeItem('taskfuchs_user');
    }
  }, [state.isAuthenticated, state.user, state.token]);

  const login = async (email: string, password: string): Promise<boolean> => {
    dispatch({ type: 'LOGIN_START' });
    try {
      if (!supabase) throw new Error('Supabase not configured');
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.session) {
        dispatch({ type: 'LOGIN_FAILURE', payload: error?.message || 'Login fehlgeschlagen' });
        return false;
      }
      const s = data.session;
      const user: User = {
        id: s.user.id,
        email: s.user.email || '',
        name: s.user.user_metadata?.name || s.user.email || 'User',
        avatar: s.user.user_metadata?.avatar_url,
        createdAt: s.user.created_at || new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        profiles: [],
        activeProfileId: undefined,
        preferences: undefined as any
      } as any;
      dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token: s.access_token } });
      // Fire and forget: initial backup of local data
      uploadInitialBackupIfNeeded(user.id).catch(() => {});
      return true;
    } catch (e: any) {
      dispatch({ type: 'LOGIN_FAILURE', payload: e?.message || 'Login fehlgeschlagen' });
      return false;
    }
  };

  const register = async (email: string, password: string, name: string): Promise<boolean> => {
    dispatch({ type: 'REGISTER_START' });
    try {
      if (!supabase) throw new Error('Supabase not configured');
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
      if (error || !data.user) {
        dispatch({ type: 'REGISTER_FAILURE', payload: error?.message || 'Registrierung fehlgeschlagen' });
        return false;
      }
      // Supabase sendet Bestätigungs-Mail; Login erfolgt nach Verifizierung
      return true;
    } catch (e: any) {
      dispatch({ type: 'REGISTER_FAILURE', payload: e?.message || 'Registrierung fehlgeschlagen' });
      return false;
    }
  };

  const logout = () => {
    if (supabase) supabase.auth.signOut().finally(() => dispatch({ type: 'LOGOUT' }));
    else dispatch({ type: 'LOGOUT' });
  };

  const updateUser = (updates: Partial<User>) => {
    dispatch({ type: 'UPDATE_USER', payload: updates });
  };

  const isGuest = () => {
    return !state.isAuthenticated;
  };

  const value: AuthContextType = {
    state,
    login,
    register,
    logout,
    updateUser,
    isGuest
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