import React from 'react';
import { useApp } from '../../context/AppContext';

interface DropIndicatorProps {
  isVisible: boolean;
  position: 'top' | 'bottom' | 'between';
  compact?: boolean; // For list view - smaller height
}

export function DropIndicator({ isVisible, position, compact = false }: DropIndicatorProps) {
  const { state } = useApp();
  const accentColor = state.preferences.accentColor || '#0ea5e9';
  
  // Compact mode: 44px height (matches list view cards), normal: 80px
  const expandedHeight = compact ? '44px' : '80px';
  
  // ✨ GAP EFFECT: Smoothly expand to push tasks apart when visible
  return (
    <div 
      className="w-full overflow-hidden"
      style={{
        // ✨ Animate height to create actual gap that pushes content
        height: isVisible ? expandedHeight : '0px',
        opacity: 1,
        transition: 'height 150ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        transform: 'translateZ(0)',
        willChange: 'height',
        pointerEvents: 'none',
      }}
    >
      {/* ✨ Inner content - the visual drop zone */}
      <div 
        className={`w-full h-full border-2 border-dashed flex items-center justify-center mx-auto ${compact ? 'rounded-lg' : 'rounded-xl'}`}
        style={{
          borderColor: isVisible ? `${accentColor}70` : 'transparent',
          backgroundColor: isVisible ? `${accentColor}15` : 'transparent',
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 100ms ease-out, border-color 100ms ease-out, background-color 100ms ease-out',
          transform: 'translateZ(0)',
          margin: compact ? '2px 0' : '4px 0',
          height: compact ? 'calc(100% - 4px)' : 'calc(100% - 8px)',
        }}
      >
        {/* Drop hint text - hide in compact mode for cleaner look */}
        {!compact && (
          <div 
            className="text-sm font-medium"
            style={{ 
              color: accentColor,
              opacity: isVisible ? 0.8 : 0,
              transition: 'opacity 100ms ease-out',
            }}
          >
            Drop here
          </div>
        )}
      </div>
    </div>
  );
} 