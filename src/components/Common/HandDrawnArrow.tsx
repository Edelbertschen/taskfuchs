import React from 'react';

interface HandDrawnArrowProps {
  direction: 'left' | 'right' | 'up' | 'down' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
  animated?: boolean;
  delay?: number;
  style?: 'loop' | 'swirl' | 'curved' | 'zigzag';
}

export function HandDrawnArrow({ 
  direction, 
  size = 'md', 
  color = 'currentColor',
  className = '',
  animated = true,
  delay = 0,
  style = 'loop'
}: HandDrawnArrowProps) {
  
  const sizeMap = {
    sm: { width: 60, height: 40 },
    md: { width: 100, height: 60 },
    lg: { width: 140, height: 80 }
  };
  
  const { width, height } = sizeMap[size];
  
  // Get rotation based on direction
  const getRotation = () => {
    switch (direction) {
      case 'right': return 0;
      case 'left': return 180;
      case 'up': return -90;
      case 'down': return 90;
      case 'top-right': return -30;
      case 'top-left': return -150;
      case 'bottom-right': return 30;
      case 'bottom-left': return 150;
      default: return 0;
    }
  };
  
  // Different arrow path styles
  const getPath = () => {
    switch (style) {
      case 'loop':
        // Arrow with elegant loop
        return `
          M 10,${height/2}
          Q 25,${height/2 - 15} 35,${height/2 - 8}
          C 45,${height/2 - 20} 55,${height/2 + 15} 45,${height/2 + 5}
          Q 35,${height/2 - 5} 50,${height/2}
          Q 65,${height/2 + 5} ${width - 20},${height/2}
        `;
      case 'swirl':
        // Arrow with swirl element
        return `
          M 10,${height/2}
          Q 20,${height/2 - 10} 30,${height/2}
          C 40,${height/2 + 20} 50,${height/2 - 20} 60,${height/2}
          C 70,${height/2 + 15} 55,${height/2 + 10} 65,${height/2}
          Q 75,${height/2 - 5} ${width - 20},${height/2}
        `;
      case 'curved':
        // Simple curved arrow
        return `
          M 10,${height/2 + 10}
          Q 30,${height/2 - 15} 50,${height/2}
          Q 70,${height/2 + 10} ${width - 20},${height/2}
        `;
      case 'zigzag':
        // Zigzag arrow
        return `
          M 10,${height/2}
          L 25,${height/2 - 12}
          L 40,${height/2 + 8}
          L 55,${height/2 - 8}
          L 70,${height/2 + 5}
          L ${width - 20},${height/2}
        `;
      default:
        return `M 10,${height/2} Q 50,${height/2 - 10} ${width - 20},${height/2}`;
    }
  };
  
  // Arrowhead path
  const arrowHead = `
    M ${width - 20},${height/2}
    L ${width - 8},${height/2 - 8}
    M ${width - 20},${height/2}
    L ${width - 8},${height/2 + 8}
  `;
  
  const animationStyle = animated ? {
    animation: `hand-drawn-arrow-draw 0.8s ease-out ${delay}ms forwards`,
    strokeDasharray: 200,
    strokeDashoffset: 200,
  } : {};
  
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`hand-drawn-arrow ${className}`}
      style={{
        transform: `rotate(${getRotation()}deg)`,
        overflow: 'visible',
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
      }}
    >
      <defs>
        {/* Rough/hand-drawn effect filter */}
        <filter id="roughPaper" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" result="noise"/>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
      </defs>
      
      {/* Main arrow path */}
      <path
        d={getPath()}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={animationStyle}
        filter="url(#roughPaper)"
      />
      
      {/* Arrowhead */}
      <path
        d={arrowHead}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          ...animationStyle,
          animationDelay: `${delay + 400}ms`,
        }}
        filter="url(#roughPaper)"
      />
    </svg>
  );
}

// CSS keyframes for the draw animation - add to index.css or inject
const injectStyles = () => {
  if (typeof document === 'undefined') return;
  
  const styleId = 'hand-drawn-arrow-styles';
  if (document.getElementById(styleId)) return;
  
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes hand-drawn-arrow-draw {
      to {
        stroke-dashoffset: 0;
      }
    }
    
    @keyframes hand-drawn-arrow-bounce {
      0%, 100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-5px);
      }
    }
    
    .hand-drawn-arrow {
      opacity: 0;
      animation: hand-drawn-arrow-fade-in 0.3s ease-out forwards;
    }
    
    @keyframes hand-drawn-arrow-fade-in {
      to {
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);
};

// Inject styles on module load
if (typeof window !== 'undefined') {
  injectStyles();
}

// Preset arrow combinations for common onboarding scenarios
export function PointingArrow({ 
  target, 
  color,
  label,
  labelPosition = 'top'
}: { 
  target: 'sidebar' | 'button' | 'card' | 'input' | 'icon';
  color?: string;
  label?: string;
  labelPosition?: 'top' | 'bottom' | 'left' | 'right';
}) {
  const configs = {
    sidebar: { direction: 'left' as const, style: 'loop' as const, size: 'md' as const },
    button: { direction: 'down' as const, style: 'swirl' as const, size: 'sm' as const },
    card: { direction: 'right' as const, style: 'curved' as const, size: 'md' as const },
    input: { direction: 'up' as const, style: 'loop' as const, size: 'sm' as const },
    icon: { direction: 'down' as const, style: 'zigzag' as const, size: 'sm' as const },
  };
  
  const config = configs[target];
  
  return (
    <div className="relative inline-flex flex-col items-center">
      {label && labelPosition === 'top' && (
        <span 
          className="text-sm font-medium mb-1 whitespace-nowrap"
          style={{ color }}
        >
          {label}
        </span>
      )}
      <HandDrawnArrow 
        direction={config.direction}
        style={config.style}
        size={config.size}
        color={color}
      />
      {label && labelPosition === 'bottom' && (
        <span 
          className="text-sm font-medium mt-1 whitespace-nowrap"
          style={{ color }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

export default HandDrawnArrow;

