import React, { useRef, useState, useEffect } from 'react';

interface MobilePullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
}

export function MobilePullToRefresh({ onRefresh, children }: MobilePullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (el.scrollTop === 0) {
        startYRef.current = e.touches[0].clientY;
      } else {
        startYRef.current = null;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (startYRef.current == null) return;
      const delta = e.touches[0].clientY - startYRef.current;
      if (delta > 0) {
        e.preventDefault();
        setPullDistance(Math.min(80, delta * 0.6));
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance >= 60 && !refreshing) {
        try {
          setRefreshing(true);
          await onRefresh();
        } finally {
          setRefreshing(false);
        }
      }
      setPullDistance(0);
      startYRef.current = null;
    };

    el.addEventListener('touchstart', handleTouchStart as any, { passive: true } as any);
    el.addEventListener('touchmove', handleTouchMove as any, { passive: false } as any);
    el.addEventListener('touchend', handleTouchEnd as any, { passive: true } as any);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart as any);
      el.removeEventListener('touchmove', handleTouchMove as any);
      el.removeEventListener('touchend', handleTouchEnd as any);
    };
  }, [onRefresh, refreshing, pullDistance]);

  return (
    <div ref={containerRef} className="overflow-y-auto overscroll-y-contain touch-pan-y">
      <div className="sticky top-0 z-10 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400 h-[40px]" style={{ transform: `translateY(${pullDistance}px)` }}>
        {refreshing ? 'Aktualisiere…' : pullDistance > 0 ? 'Zum Aktualisieren loslassen' : ''}
      </div>
      <div style={{ transform: `translateY(${pullDistance}px)` }}>
        {children}
      </div>
    </div>
  );
}


