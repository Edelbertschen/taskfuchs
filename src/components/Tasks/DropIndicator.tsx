import React from 'react';
import { useApp } from '../../context/AppContext';

interface DropIndicatorProps {
  isVisible: boolean;
  position: 'top' | 'bottom' | 'between';
}

export function DropIndicator({ isVisible, position }: DropIndicatorProps) {
  const { state } = useApp();
  const accentColor = state.preferences.accentColor || '#0ea5e9';
  
  if (!isVisible) return null;

  return (
    <div 
      className="w-full"
      style={{
        height: isVisible ? '74px' : '0px', // Dynamic height to prevent column extension
        opacity: isVisible ? 1 : 0,
        transition: 'none', // No transitions for instant response
        overflow: 'hidden',
        transform: 'translateZ(0)',
        willChange: 'auto', // Let browser optimize
        pointerEvents: 'none', // Never interfere with interactions
        // Anti-flicker: Force immediate layout update
        contain: 'layout size style',
      }}
    >
      {/* ✨ Elegant Drop Space - Like iOS */}
      <div 
        className="w-full h-full rounded-lg border-2 border-dashed flex items-center justify-center"
        style={{
          borderColor: `${accentColor}60`,
          backgroundColor: `${accentColor}08`,
          transition: 'none', // No transitions on inner element
          transform: 'translateZ(0)', // GPU acceleration
          contain: 'layout style', // Optimize rendering
        }}
      >
        {/* Simple, elegant drop hint */}
        <div 
          className="text-sm font-medium opacity-60"
          style={{ color: accentColor }}
        >
          Drop here
        </div>
      </div>
    </div>
  );
} 