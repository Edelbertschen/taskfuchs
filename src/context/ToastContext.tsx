import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';

// Toast types
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Toast component
function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [isExiting, setIsExiting] = useState(false);
  
  useEffect(() => {
    const duration = toast.duration || (toast.type === 'error' ? 8000 : 4000);
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onRemove(toast.id), 300);
    }, duration);
    
    return () => clearTimeout(timer);
  }, [toast, onRemove]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />
  };

  const bgColors = {
    success: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800',
    error: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800',
    warning: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800',
    info: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800'
  };

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-lg border shadow-lg
        ${bgColors[toast.type]}
        ${isExiting ? 'animate-slide-out' : 'animate-slide-in'}
        max-w-md w-full
      `}
      role="alert"
    >
      <div className="flex-shrink-0">{icons[toast.type]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 dark:text-gray-200 break-words">
          {toast.message}
        </p>
      </div>
      <button
        onClick={handleClose}
        className="flex-shrink-0 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
      >
        <X className="w-4 h-4 text-gray-500" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration?: number) => {
    const id = `toast-${++toastIdRef.current}`;
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const showError = useCallback((message: string) => {
    showToast(message, 'error', 8000);
  }, [showToast]);

  const showSuccess = useCallback((message: string) => {
    showToast(message, 'success', 4000);
  }, [showToast]);

  const showWarning = useCallback((message: string) => {
    showToast(message, 'warning', 6000);
  }, [showToast]);

  const showInfo = useCallback((message: string) => {
    showToast(message, 'info', 4000);
  }, [showToast]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Register global functions for use outside React components
  useEffect(() => {
    setGlobalToastFunctions(showError, showSuccess);
  }, [showError, showSuccess]);

  return (
    <ToastContext.Provider value={{ showToast, showError, showSuccess, showWarning, showInfo }}>
      {children}
      
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[100000] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onRemove={removeToast} />
          </div>
        ))}
      </div>

      {/* Animations */}
      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slide-out {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
        .animate-slide-out {
          animation: slide-out 0.3s ease-in forwards;
        }
      `}</style>
    </ToastContext.Provider>
  );
}

// Export a global toast function for use outside React components
let globalShowError: ((message: string) => void) | null = null;
let globalShowSuccess: ((message: string) => void) | null = null;

export function setGlobalToastFunctions(
  showError: (message: string) => void,
  showSuccess: (message: string) => void
) {
  globalShowError = showError;
  globalShowSuccess = showSuccess;
}

export function showGlobalError(message: string) {
  if (globalShowError) {
    globalShowError(message);
  } else {
    console.error('[Toast not available]', message);
  }
}

export function showGlobalSuccess(message: string) {
  if (globalShowSuccess) {
    globalShowSuccess(message);
  } else {
    console.log('[Toast not available]', message);
  }
}

