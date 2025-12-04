import React from 'react';
import { useApp } from '../../context/AppContext';

interface DropIndicatorProps {
  isVisible: boolean;
  position: 'top' | 'bottom' | 'between';
}

export function DropIndicator({ isVisible, position }: DropIndicatorProps) {
  const { state } = useApp();
  const accentColor = state.preferences.accentColor || '#0ea5e9';
  
  // ✨ ANTI-JITTER FIX: Always render the container with fixed height
  // Only toggle visibility of inner content to prevent layout shifts
  return (
    <div 
      className="w-full"
      style={{
        // ✨ Fixed height container - prevents layout shifts when toggling visibility
        height: '8px', // Small fixed height that doesn't disrupt layout
        minHeight: '8px',
        maxHeight: isVisible ? '74px' : '8px',
        opacity: 1,
        // ✨ Smooth height transition only when becoming visible
        transition: isVisible ? 'max-height 150ms ease-out' : 'max-height 100ms ease-in',
        overflow: 'hidden',
        transform: 'translateZ(0)',
        willChange: 'max-height',
        pointerEvents: 'none',
        contain: 'layout style',
      }}
    >
      {/* ✨ Inner content - only visible when dropping */}
      <div 
        className="w-full rounded-lg border-2 border-dashed flex items-center justify-center"
        style={{
          height: '74px',
          borderColor: isVisible ? `${accentColor}60` : 'transparent',
          backgroundColor: isVisible ? `${accentColor}08` : 'transparent',
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 100ms ease-out, border-color 100ms ease-out, background-color 100ms ease-out',
          transform: 'translateZ(0)',
          contain: 'layout style',
        }}
      >
        {/* Simple, elegant drop hint */}
        <div 
          className="text-sm font-medium"
          style={{ 
            color: accentColor,
            opacity: isVisible ? 0.6 : 0,
            transition: 'opacity 100ms ease-out',
          }}
        >
          Drop here
        </div>
      </div>
    </div>
  );
} 