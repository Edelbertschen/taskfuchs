import React, { useState, useEffect, useRef } from 'react';

interface PageTransitionProps {
  currentView: string;
  children: React.ReactNode;
  className?: string;
}

export function PageTransition({ currentView, children, className = '' }: PageTransitionProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayView, setDisplayView] = useState(currentView);
  const previousViewRef = useRef(currentView);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (currentView !== previousViewRef.current) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Start transition - very quick fade/morph effect
      setIsTransitioning(true);

      // Update display view almost immediately
      timeoutRef.current = setTimeout(() => {
        setDisplayView(currentView);
        previousViewRef.current = currentView;
        
        // End transition after quick fade-in
        setTimeout(() => {
          setIsTransitioning(false);
        }, 80); // Very short fade-in
      }, 30); // Minimal delay
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [currentView]);

  return (
    <div 
      className={`page-transition-wrapper ${className}`}
      style={{
        opacity: isTransitioning ? 0.7 : 1,
        transition: 'opacity 80ms ease-out'
      }}
    >
      {children}
    </div>
  );
}

// Hook for smooth navigation with transitions
export function useSmoothNavigation() {
  const [isNavigating, setIsNavigating] = useState(false);

  const navigateWithTransition = (navigationFn: () => void) => {
    setIsNavigating(true);
    
    // Use View Transition API if available
    if ('startViewTransition' in document) {
      // @ts-ignore
      document.startViewTransition(() => {
        navigationFn();
        setTimeout(() => setIsNavigating(false), 300);
      });
    } else {
      // Fallback to custom transition
      setTimeout(() => {
        navigationFn();
        setTimeout(() => setIsNavigating(false), 300);
      }, 100);
    }
  };

  return { isNavigating, navigateWithTransition };
}

// Smooth scroll utility
export function smoothScrollTo(element: HTMLElement | null, offset: number = 0) {
  if (!element) return;

  const targetPosition = element.offsetTop - offset;
  
  // Use native smooth scrolling if supported
  if ('scrollBehavior' in document.documentElement.style) {
    window.scrollTo({
      top: targetPosition,
      behavior: 'smooth'
    });
  } else {
    // Fallback for older browsers
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    const duration = 500;
    let start: number | null = null;

    function animation(currentTime: number) {
      if (start === null) start = currentTime;
      const timeElapsed = currentTime - start;
      const run = easeInOutQuad(timeElapsed, startPosition, distance, duration);
      window.scrollTo(0, run);
      if (timeElapsed < duration) requestAnimationFrame(animation);
    }

    function easeInOutQuad(t: number, b: number, c: number, d: number) {
      t /= d / 2;
      if (t < 1) return c / 2 * t * t + b;
      t--;
      return -c / 2 * (t * (t - 2) - 1) + b;
    }

    requestAnimationFrame(animation);
  }
}

// Enhanced button component with micro-animations
interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  success?: boolean;
  children: React.ReactNode;
}

export function AnimatedButton({ 
  variant = 'primary', 
  size = 'md', 
  loading = false, 
  success = false,
  className = '', 
  children, 
  onClick,
  ...props 
}: AnimatedButtonProps) {
  const [isClicked, setIsClicked] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 200);
    
    if (onClick) {
      onClick(e);
    }
  };

  const baseClasses = 'btn-hover btn-enhanced focus-ring-animated relative overflow-hidden';
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };
  
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-700'
  };

  return (
    <button
      className={`
        ${baseClasses} 
        ${sizeClasses[size]} 
        ${variantClasses[variant]}
        ${isClicked ? 'scale-95' : 'scale-100'}
        ${success ? 'success-pulse' : ''}
        ${loading ? 'cursor-not-allowed opacity-70' : ''}
        ${className}
        transition-all duration-200 ease-out rounded-lg font-medium
      `}
      onClick={handleClick}
      disabled={loading}
      {...props}
    >
      {loading ? (
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          <span>Loading...</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
}

// Enhanced card component with hover animations
interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export function AnimatedCard({ children, className = '', onClick, hoverable = true }: AnimatedCardProps) {
  return (
    <div
      className={`
        ${hoverable ? 'card-hover cursor-pointer' : ''}
        ${className}
        rounded-lg border border-gray-200 dark:border-gray-700 
        bg-white dark:bg-gray-800 p-4
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
} 