import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { AuthState, User, UserPreferences } from '../types';

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

  // Restore session on app start
  useEffect(() => {
    const storedToken = localStorage.getItem('taskfuchs_token');
    const storedUser = localStorage.getItem('taskfuchs_user');

    if (storedToken && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        dispatch({
          type: 'RESTORE_SESSION',
          payload: { user, token: storedToken }
        });
      } catch (error) {
        console.error('Failed to restore session:', error);
        localStorage.removeItem('taskfuchs_token');
        localStorage.removeItem('taskfuchs_user');
      }
    }
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
      // Demo implementation - replace with real API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
      
      if (email === 'demo@taskfuchs.app' && password === 'demo123') {
        const user: User = {
          id: 'demo-user-1',
          email: email,
          name: 'Demo User',
          avatar: undefined,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          profiles: [
            {
              id: 'default-profile',
              name: 'Standard',
              description: 'Ihr Standard-Profil',
              color: '#f97316'
            }
          ],
          activeProfileId: 'default-profile',
                  preferences: {
          theme: 'system',
          language: 'de',
          accentColor: '#f97316',
          notifications: {
            email: true,
            push: true,
            timerReminders: true,
            deadlineReminders: true
          },
          privacy: {
            analytics: false,
            crashReports: true
          },
          dateFormat: 'DD.MM.YYYY',
          sounds: true,
          soundVolume: 0.8,
          completionSound: 'bell',
            enableCelebration: true,
            celebrationText: 'Gut gemacht!',
            celebrationDuration: 3000,
            columns: {
              visible: 5,
              showProjects: true
            },
            showPriorities: true,
            enableFocusMode: true,
            pomodoro: {
              enabled: false,
              workDuration: 25,
              shortBreakDuration: 5,
              longBreakDuration: 15,
              longBreakInterval: 4,
              autoStartBreaks: false,
              autoStartWork: false,
              soundEnabled: true,
              pomodoroSound: 'bell',
              breakSound: 'chime',
              taskSound: 'pop'
            },
            timer: {
              showOverlay: true,
              overlayPosition: { x: 50, y: 50 },
              overlayMinimized: false,
              autoOpenTaskOnStart: true,
              showRemainingTime: true
            }
          }
        };

        const token = 'demo-token-' + Date.now();
        
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user, token }
        });
        
        return true;
      } else {
        dispatch({
          type: 'LOGIN_FAILURE',
          payload: 'Ungültige Anmeldedaten'
        });
        return false;
      }
    } catch (error) {
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: 'Verbindungsfehler'
      });
      return false;
    }
  };

  const register = async (email: string, password: string, name: string): Promise<boolean> => {
    dispatch({ type: 'REGISTER_START' });

    try {
      // Demo implementation - replace with real API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
      
      const user: User = {
        id: 'user-' + Date.now(),
        email: email,
        name: name,
        avatar: undefined,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        profiles: [
          {
            id: 'default-profile',
            name: 'Standard',
            description: 'Ihr Standard-Profil',
            color: '#f97316'
          }
        ],
        activeProfileId: 'default-profile',
        preferences: {
          theme: 'system',
          language: 'de',
          accentColor: '#f97316',
          notifications: {
            email: true,
            push: true,
            timerReminders: true,
            deadlineReminders: true
          },
          privacy: {
            analytics: false,
            crashReports: true
          },
          dateFormat: 'DD.MM.YYYY',
          sounds: true,
          soundVolume: 0.8,
          completionSound: 'bell',
          enableCelebration: true,
          celebrationText: 'Gut gemacht!',
          celebrationDuration: 3000,
          columns: {
            visible: 5,
            showProjects: true
          },
          showPriorities: true,
          enableFocusMode: true,
          pomodoro: {
            enabled: false,
            workDuration: 25,
            shortBreakDuration: 5,
            longBreakDuration: 15,
            longBreakInterval: 4,
            autoStartBreaks: false,
            autoStartWork: false,
            soundEnabled: true,
            pomodoroSound: 'bell',
            breakSound: 'chime',
            taskSound: 'pop'
          },
          timer: {
            showOverlay: true,
            overlayPosition: { x: 50, y: 50 },
            overlayMinimized: false,
            autoOpenTaskOnStart: true,
            showRemainingTime: true
          }
        }
      };

      const token = 'token-' + Date.now();
      
      dispatch({
        type: 'REGISTER_SUCCESS',
        payload: { user, token }
      });
      
      return true;
    } catch (error) {
      dispatch({
        type: 'REGISTER_FAILURE',
        payload: 'Registrierung fehlgeschlagen'
      });
      return false;
    }
  };

  const logout = () => {
    dispatch({ type: 'LOGOUT' });
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