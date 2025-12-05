import React from 'react';
import { useApp } from '../../context/AppContext';

interface DropIndicatorProps {
  isVisible: boolean;
  position: 'top' | 'bottom' | 'between';
}

export function DropIndicator({ isVisible, position }: DropIndicatorProps) {
  const { state } = useApp();
  const accentColor = state.preferences.accentColor || '#0ea5e9';
  
  // ✨ GAP EFFECT: Smoothly expand to push tasks apart when visible
  return (
    <div 
      className="w-full overflow-hidden"
      style={{
        // ✨ Animate height to create actual gap that pushes content
        height: isVisible ? '80px' : '0px',
        opacity: 1,
        transition: 'height 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        transform: 'translateZ(0)',
        willChange: 'height',
        pointerEvents: 'none',
      }}
    >
      {/* ✨ Inner content - the visual drop zone */}
      <div 
        className="w-full h-full rounded-xl border-2 border-dashed flex items-center justify-center mx-auto"
        style={{
          borderColor: isVisible ? `${accentColor}70` : 'transparent',
          backgroundColor: isVisible ? `${accentColor}15` : 'transparent',
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 150ms ease-out, border-color 150ms ease-out, background-color 150ms ease-out',
          transform: 'translateZ(0)',
          margin: '4px 0',
          height: 'calc(100% - 8px)',
        }}
      >
        {/* Drop hint text */}
        <div 
          className="text-sm font-medium"
          style={{ 
            color: accentColor,
            opacity: isVisible ? 0.8 : 0,
            transition: 'opacity 150ms ease-out',
          }}
        >
          Drop here
        </div>
      </div>
    </div>
  );
} 