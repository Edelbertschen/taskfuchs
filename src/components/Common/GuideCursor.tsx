import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MousePointer2 } from 'lucide-react';

interface GuideCursorProps {
  targetSelector: string; // CSS selector for target element
  onAnimationComplete?: () => void;
  accentColor: string;
  delay?: number; // Delay before animation starts (ms)
  showClick?: boolean; // Whether to show click animation (default: true)
  holdDuration?: number; // How long to hold at target before completing (ms, default: 1000)
}

export const GuideCursor: React.FC<GuideCursorProps> = ({ 
  targetSelector, 
  onAnimationComplete,
  accentColor,
  delay = 400,
  showClick = true,
  holdDuration = 1000
}) => {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [targetPosition, setTargetPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  useEffect(() => {
    // Initial delay before showing cursor
    const showTimeout = setTimeout(() => {
      setIsVisible(true);
      
      // Find target element
      const targetElement = document.querySelector(targetSelector);
      if (!targetElement) {
        console.warn(`GuideCursor: Target element not found: ${targetSelector}`);
        // Still call onAnimationComplete so navigation can proceed without visual cursor
        onAnimationComplete?.();
        return;
      }

      const rect = targetElement.getBoundingClientRect();
      const targetX = rect.left + rect.width / 2;
      const targetY = rect.top + rect.height / 2;

      // Start position (slightly offset from target)
      setPosition({ 
        x: targetX - 200, 
        y: targetY - 100 
      });

      // Trigger movement animation
      setTimeout(() => {
        setTargetPosition({ x: targetX, y: targetY });
        setIsAnimating(true);

        // After movement, either click or just hold
        setTimeout(() => {
          if (showClick) {
            setIsClicking(true);
            // After click, fade out and complete
            setTimeout(() => {
              setIsVisible(false);
              setTimeout(() => {
                onAnimationComplete?.();
              }, 300);
            }, 600);
          } else {
            // Just hold at position, then fade out
            setTimeout(() => {
              setIsVisible(false);
              setTimeout(() => {
                onAnimationComplete?.();
              }, 300);
            }, holdDuration);
          }
        }, 800);
      }, 100);
    }, delay);

    return () => clearTimeout(showTimeout);
  }, [targetSelector, onAnimationComplete, delay, showClick, holdDuration]);

  if (!isVisible) return null;

  const content = (
    <>
      {/* Backdrop dimming */}
      <div 
        className="fixed inset-0 bg-black/20 pointer-events-none transition-opacity duration-500"
        style={{ 
          zIndex: 999998,
          opacity: isVisible ? 1 : 0
        }}
      />

      {/* Guide Cursor */}
      <div
        className="fixed pointer-events-none transition-all duration-700 ease-out"
        style={{
          left: isAnimating ? targetPosition.x : position.x,
          top: isAnimating ? targetPosition.y : position.y,
          transform: 'translate(-50%, -50%)',
          zIndex: 999999,
          opacity: isVisible ? 1 : 0,
        }}
      >
        {/* Glow Effect */}
        <div 
          className="absolute inset-0 rounded-full blur-xl"
          style={{
            width: '80px',
            height: '80px',
            background: `radial-gradient(circle, ${accentColor}40 0%, transparent 70%)`,
            transform: 'translate(-40px, -40px)',
          }}
        />

        {/* Cursor Icon */}
        <div
          className="relative"
          style={{
            filter: `drop-shadow(0 4px 12px ${accentColor}60)`,
            transform: isClicking ? 'scale(0.9)' : 'scale(1)',
            transition: 'transform 0.2s ease-out',
          }}
        >
          <MousePointer2 
            size={48}
            strokeWidth={2.5}
            style={{ 
              color: accentColor,
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
            }}
          />
        </div>

        {/* Click Ripple */}
        {isClicking && (
          <>
            <div 
              className="absolute rounded-full animate-click-ripple-1"
              style={{
                width: '60px',
                height: '60px',
                border: `3px solid ${accentColor}`,
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
              }}
            />
            <div 
              className="absolute rounded-full animate-click-ripple-2"
              style={{
                width: '60px',
                height: '60px',
                border: `2px solid ${accentColor}`,
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
              }}
            />
          </>
        )}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes click-ripple-1 {
          0% {
            transform: translate(-50%, -50%) scale(0.5);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(2.5);
            opacity: 0;
          }
        }

        @keyframes click-ripple-2 {
          0% {
            transform: translate(-50%, -50%) scale(0.7);
            opacity: 0.8;
          }
          100% {
            transform: translate(-50%, -50%) scale(3.2);
            opacity: 0;
          }
        }

        .animate-click-ripple-1 {
          animation: click-ripple-1 0.6s ease-out forwards;
        }

        .animate-click-ripple-2 {
          animation: click-ripple-2 0.6s ease-out 0.1s forwards;
        }
      `}</style>
    </>
  );

  return createPortal(content, document.body);
};

