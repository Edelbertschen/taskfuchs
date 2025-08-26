import React, { createContext, useContext, useReducer, ReactNode, useCallback } from 'react';

interface PerformanceState {
  renderCounts: Record<string, number>;
  slowRenders: string[];
  memoryUsage: number;
  isPerformanceMode: boolean;
}

interface PerformanceContextType {
  state: PerformanceState;
  trackRender: (componentName: string) => void;
  trackSlowRender: (componentName: string) => void;
  updateMemoryUsage: (usage: number) => void;
  togglePerformanceMode: () => void;
}

type PerformanceAction = 
  | { type: 'TRACK_RENDER'; payload: string }
  | { type: 'TRACK_SLOW_RENDER'; payload: string }
  | { type: 'UPDATE_MEMORY_USAGE'; payload: number }
  | { type: 'TOGGLE_PERFORMANCE_MODE' };

const initialState: PerformanceState = {
  renderCounts: {},
  slowRenders: [],
  memoryUsage: 0,
  isPerformanceMode: false,
};

function performanceReducer(state: PerformanceState, action: PerformanceAction): PerformanceState {
  switch (action.type) {
    case 'TRACK_RENDER':
      return {
        ...state,
        renderCounts: {
          ...state.renderCounts,
          [action.payload]: (state.renderCounts[action.payload] || 0) + 1,
        },
      };
    case 'TRACK_SLOW_RENDER':
      return {
        ...state,
        slowRenders: [...state.slowRenders.slice(-50), action.payload], // Keep last 50
      };
    case 'UPDATE_MEMORY_USAGE':
      return {
        ...state,
        memoryUsage: action.payload,
      };
    case 'TOGGLE_PERFORMANCE_MODE':
      return {
        ...state,
        isPerformanceMode: !state.isPerformanceMode,
      };
    default:
      return state;
  }
}

const PerformanceContext = createContext<PerformanceContextType | undefined>(undefined);

export function PerformanceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(performanceReducer, initialState);

  const trackRender = useCallback((componentName: string) => {
    if (state.isPerformanceMode) {
      dispatch({ type: 'TRACK_RENDER', payload: componentName });
    }
  }, [state.isPerformanceMode]);

  const trackSlowRender = useCallback((componentName: string) => {
    if (state.isPerformanceMode) {
      dispatch({ type: 'TRACK_SLOW_RENDER', payload: componentName });
    }
  }, [state.isPerformanceMode]);

  const updateMemoryUsage = useCallback((usage: number) => {
    dispatch({ type: 'UPDATE_MEMORY_USAGE', payload: usage });
  }, []);

  const togglePerformanceMode = useCallback(() => {
    dispatch({ type: 'TOGGLE_PERFORMANCE_MODE' });
  }, []);

  const value = {
    state,
    trackRender,
    trackSlowRender,
    updateMemoryUsage,
    togglePerformanceMode,
  };

  return (
    <PerformanceContext.Provider value={value}>
      {children}
    </PerformanceContext.Provider>
  );
}

export function usePerformance() {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error('usePerformance must be used within a PerformanceProvider');
  }
  return context;
} 