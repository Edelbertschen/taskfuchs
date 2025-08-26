// Performance monitoring utilities
import { useEffect, useRef, useState, useCallback } from 'react';

export interface PerformanceMetrics {
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
  componentName: string;
  isSlowRender: boolean;
}

// Hook to track component render performance
export function usePerformanceMonitor(componentName: string) {
  const renderCountRef = useRef(0);
  const renderTimesRef = useRef<number[]>([]);
  const lastRenderTimeRef = useRef(0);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    componentName,
    isSlowRender: false
  });

  useEffect(() => {
    const startTime = performance.now();
    renderCountRef.current += 1;
    
    // Calculate render time in next tick to avoid infinite loops
    setTimeout(() => {
      const renderTime = performance.now() - startTime;
      renderTimesRef.current.push(renderTime);
      
      // Keep only last 100 renders
      if (renderTimesRef.current.length > 100) {
        renderTimesRef.current.shift();
      }
      
      const averageTime = renderTimesRef.current.reduce((sum, time) => sum + time, 0) / renderTimesRef.current.length;
      const isSlowRender = renderTime > 16; // 60fps threshold
      
      lastRenderTimeRef.current = renderTime;
      
      setMetrics({
        renderCount: renderCountRef.current,
        lastRenderTime: renderTime,
        averageRenderTime: averageTime,
        componentName,
        isSlowRender
      });
      
      // Log slow renders in development
      if (isSlowRender && process.env.NODE_ENV === 'development') {
        console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
      }
    }, 0);
  });

  return metrics;
}

// Performance optimization checker
export function useOptimizationChecker() {
  const [optimizations, setOptimizations] = useState<string[]>([]);
  
  const checkOptimization = useCallback((checkName: string, condition: boolean) => {
    if (!condition) {
      setOptimizations(prev => {
        if (!prev.includes(checkName)) {
          return [...prev, checkName];
        }
        return prev;
      });
    }
  }, []);

  return { optimizations, checkOptimization };
}

// Memory usage monitor
export function useMemoryMonitor() {
  const [memoryUsage, setMemoryUsage] = useState<number>(0);
  
  useEffect(() => {
    const checkMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMemoryUsage(memory.usedJSHeapSize / 1024 / 1024); // Convert to MB
      }
    };
    
    const interval = setInterval(checkMemory, 5000); // Check every 5 seconds
    checkMemory();
    
    return () => clearInterval(interval);
  }, []);
  
  return memoryUsage;
}

// Performance report generator
export function generatePerformanceReport() {
  const report = {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    memory: 'memory' in performance ? (performance as any).memory : null,
    timing: performance.timing,
    navigation: performance.navigation,
    recommendations: [
      'Use React.memo for components that re-render frequently',
      'Implement useCallback for event handlers',
      'Use useMemo for expensive calculations',
      'Consider virtualization for large lists',
      'Optimize image loading with lazy loading',
      'Minimize bundle size with code splitting'
    ]
  };
  
  return report;
}

// Debounce function for performance optimization
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Intersection Observer hook for lazy loading
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
): boolean {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsIntersecting(entry.isIntersecting),
      { threshold: 0.1, ...options }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, options]);

  return isIntersecting;
}

// Custom debounce hook for performance
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Custom throttle hook for performance
export function useThrottle<T>(value: T, limit: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef<number>(Date.now());
  
  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
}

// Performance-optimized state updater
export function useOptimizedState<T>(initialValue: T) {
  const [state, setState] = useState<T>(initialValue);
  const previousValueRef = useRef<T>(initialValue);
  
  const optimizedSetState = useCallback((newValue: T | ((prev: T) => T)) => {
    setState(prev => {
      const nextValue = typeof newValue === 'function' ? (newValue as (prev: T) => T)(prev) : newValue;
      
      // Only update if the value actually changed
      if (Object.is(nextValue, previousValueRef.current)) {
        return prev;
      }
      
      previousValueRef.current = nextValue;
      return nextValue;
    });
  }, []);
  
  return [state, optimizedSetState] as const;
}

// Performance tips and recommendations
export const PERFORMANCE_TIPS = {
  REACT_MEMO: 'Use React.memo to prevent unnecessary re-renders of functional components',
  USE_CALLBACK: 'Use useCallback to memoize event handlers and prevent child re-renders',
  USE_MEMO: 'Use useMemo to memoize expensive calculations',
  VIRTUAL_LISTS: 'Use virtualization for lists with many items (>100)',
  LAZY_LOADING: 'Implement lazy loading for images and components',
  CODE_SPLITTING: 'Use dynamic imports for code splitting',
  BUNDLE_ANALYSIS: 'Analyze bundle size and remove unused dependencies',
  DEBOUNCE_INPUTS: 'Debounce user inputs to reduce API calls',
  THROTTLE_EVENTS: 'Throttle scroll and resize events',
  MINIMIZE_RERENDERS: 'Minimize context re-renders by splitting contexts',
  OPTIMIZE_IMAGES: 'Optimize images with proper formats and sizes',
  REDUCE_BUNDLE_SIZE: 'Use tree shaking and remove unused code'
};

export default {
  usePerformanceMonitor,
  useOptimizationChecker,
  useMemoryMonitor,
  generatePerformanceReport,
  useDebounce,
  useThrottle,
  useOptimizedState,
  PERFORMANCE_TIPS
};

 