import React, { useRef, useState } from 'react';

interface Props {
  children: React.ReactNode;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

export function SwipeableTaskCard({ children, onSwipeLeft, onSwipeRight }: Props) {
  const startX = useRef<number | null>(null);
  const [offsetX, setOffsetX] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (startX.current == null) return;
    const dx = e.touches[0].clientX - startX.current;
    setOffsetX(Math.max(Math.min(dx, 100), -100));
  };
  const handleTouchEnd = () => {
    if (offsetX <= -60) onSwipeLeft();
    else if (offsetX >= 60) onSwipeRight();
    setOffsetX(0);
    startX.current = null;
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ transform: `translateX(${offsetX}px)`, transition: startX.current ? 'none' : 'transform 150ms ease-out' }}
    >
      {children}
    </div>
  );
}


