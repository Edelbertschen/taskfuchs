import React, { useEffect } from 'react';

interface MobileSnackbarProps {
  open: boolean;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onClose: () => void;
  durationMs?: number;
}

export function MobileSnackbar({ open, message, actionLabel = 'Rückgängig', onAction, onClose, durationMs = 3500 }: MobileSnackbarProps) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => onClose(), durationMs);
    return () => clearTimeout(t);
  }, [open, durationMs, onClose]);

  if (!open) return null;

  return (
    <div className="fixed left-0 right-0 bottom-3 z-[99999] flex justify-center px-3">
      <div className="max-w-sm w-full rounded-full shadow-lg text-sm flex items-center justify-between px-4 py-3 bg-gray-900 text-white/95 dark:bg-gray-900/95">
        <span className="pr-3 truncate">{message}</span>
        {onAction && (
          <button className="ml-2 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors" onClick={onAction}>
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}


