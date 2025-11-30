import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../../context/AppContext';

interface CelebrationProps {
  isVisible: boolean;
  onComplete?: () => void;
}

export function Celebration({ isVisible, onComplete }: CelebrationProps) {
  const { state } = useApp();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onCompleteRef = useRef(onComplete);

  // Update the ref when onComplete changes
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (isVisible) {
      console.log('Celebration started - setting 3 second timeout');
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set a 3-second timeout to close the celebration
      timeoutRef.current = setTimeout(() => {
        console.log('Celebration timeout triggered - closing celebration');
        onCompleteRef.current?.();
      }, 3000);
    } else {
      // Clear timeout if celebration is hidden
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isVisible]);

  // Don't render anything if not visible
  if (!isVisible) return null;

  // Generate confetti explosion pieces
  const confettiPieces = Array.from({ length: 300 }, (_, i) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43', '#10AC84', '#EE5A24', '#0097E6', '#8C7AE6', '#F368E0', '#3742FA', '#FF6348', '#FF9F1C'];
    const shapes = ['square', 'circle', 'triangle', 'diamond'];
    
    // Create explosion pattern from center
    const angle = (Math.PI * 2 * i) / 300;
    const radius = Math.random() * 400 + 100;
    const startX = 50; // Center of screen
    const startY = 50;
    const endX = startX + Math.cos(angle) * radius;
    const endY = startY + Math.sin(angle) * radius;
    
    return {
      id: i,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      size: Math.random() * 12 + 4,
      startX,
      startY,
      endX,
      endY,
      animationDelay: Math.random() * 0.5,
      animationDuration: Math.random() * 2 + 1.5,
      rotation: Math.random() * 360,
    };
  });

  return createPortal(
          <div 
        className="fixed inset-0 z-[1700] pointer-events-none flex items-center justify-center"
        style={{
          isolation: 'isolate',
          animation: `celebration-fade-in 0.8s ease-out forwards`,
        background: 'radial-gradient(circle at center, rgba(255,255,255,0.1) 0%, transparent 70%)',
      }}
    >
      {/* Confetti Explosion */}
      <div className="absolute inset-0 overflow-hidden">
        {confettiPieces.map((piece) => (
          <div
            key={piece.id}
            className="absolute"
            style={{
              left: `${piece.startX}%`,
              top: `${piece.startY}%`,
              width: `${piece.size}px`,
              height: `${piece.size}px`,
              backgroundColor: piece.color,
              borderRadius: piece.shape === 'circle' ? '50%' : 
                           piece.shape === 'diamond' ? '0' : 
                           piece.shape === 'triangle' ? '0' : '3px',
              transform: piece.shape === 'triangle' ? 'rotate(45deg)' : 
                        piece.shape === 'diamond' ? 'rotate(45deg)' : 'none',
              boxShadow: `0 0 10px ${piece.color}40`,
              animation: `confetti-explosion ${piece.animationDuration}s ease-out ${piece.animationDelay}s forwards`,
              '--end-x': `${piece.endX - piece.startX}%`,
              '--end-y': `${piece.endY - piece.startY}%`,
              '--rotation': `${piece.rotation}deg`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Pulsing background effect */}
      <div 
        className="absolute inset-0 rounded-full opacity-20"
        style={{
          background: `radial-gradient(circle, ${state.preferences.accentColor}20 0%, transparent 70%)`,
          animation: 'pulse-glow 2s ease-in-out infinite',
        }}
      />

      {/* Hauptcontainer für Fox und Text */}
      <div className="relative flex flex-col items-center">
        {/* Tanzender Fuchs mit verbesserter Animation */}
        <div className="relative z-10 mb-8">
          <div 
            className="w-64 h-64 relative"
            style={{
              animation: 'fox-dance-enhanced 1.5s ease-in-out infinite',
              filter: `drop-shadow(0 0 20px ${state.preferences.accentColor}50)`,
            }}
          >
            <img 
              src="/salto.png" 
              alt="Celebration" 
              className="w-full h-full object-contain"
              style={{
                animation: 'fox-wiggle-enhanced 0.8s ease-in-out infinite',
              }}
            />
            
            {/* Glowing effect around fox */}
            <div 
              className="absolute inset-0 rounded-full opacity-30"
              style={{
                background: `radial-gradient(circle, ${state.preferences.accentColor}40 0%, transparent 70%)`,
                animation: 'glow-pulse 2s ease-in-out infinite',
              }}
            />
          </div>
          
          {/* Sparkles around fox */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-yellow-300 rounded-full"
              style={{
                left: `${50 + Math.cos((Math.PI * 2 * i) / 8) * 60}%`,
                top: `${50 + Math.sin((Math.PI * 2 * i) / 8) * 60}%`,
                animation: `sparkle ${1 + Math.random()}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            />
          ))}
        </div>

        {/* Celebration Text mit Animation */}
        <div 
          className="relative z-10"
          style={{
            animation: 'text-bounce 2s ease-in-out infinite',
          }}
        >
          <div 
            className="text-5xl font-bold text-center relative"
            style={{ 
              color: state.preferences.accentColor,
              textShadow: `0 0 20px ${state.preferences.accentColor}50, 0 4px 8px rgba(0,0,0,0.3)`,
              animation: 'text-glow 2s ease-in-out infinite alternate',
            }}
          >
            {state.preferences.celebrationText || 'Gut gemacht!'}
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>
        {`
          @keyframes confetti-explosion {
            0% {
              transform: translate(0, 0) rotate(0deg) scale(1);
              opacity: 1;
            }
            100% {
              transform: translate(var(--end-x), var(--end-y)) rotate(var(--rotation)) scale(0);
              opacity: 0;
            }
          }
          
          @keyframes fox-dance-enhanced {
            0%, 100% {
              transform: translateY(0) rotate(0deg) scale(1);
            }
            25% {
              transform: translateY(-15px) rotate(-8deg) scale(1.1);
            }
            50% {
              transform: translateY(0) rotate(0deg) scale(1.15);
            }
            75% {
              transform: translateY(-10px) rotate(8deg) scale(1.05);
            }
          }
          
          @keyframes fox-wiggle-enhanced {
            0%, 100% {
              transform: rotate(0deg);
            }
            25% {
              transform: rotate(-8deg);
            }
            75% {
              transform: rotate(8deg);
            }
          }
          
          @keyframes pulse-glow {
            0%, 100% {
              transform: scale(1);
              opacity: 0.2;
            }
            50% {
              transform: scale(1.1);
              opacity: 0.4;
            }
          }
          
          @keyframes glow-pulse {
            0%, 100% {
              transform: scale(1);
              opacity: 0.3;
            }
            50% {
              transform: scale(1.2);
              opacity: 0.6;
            }
          }
          
          @keyframes sparkle {
            0%, 100% {
              transform: scale(0) rotate(0deg);
              opacity: 0;
            }
            50% {
              transform: scale(1) rotate(180deg);
              opacity: 1;
            }
          }
          
          @keyframes text-bounce {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-10px);
            }
          }
          
          @keyframes text-glow {
            0% {
              text-shadow: 0 0 20px ${state.preferences.accentColor}50, 0 4px 8px rgba(0,0,0,0.3);
            }
            100% {
              text-shadow: 0 0 30px ${state.preferences.accentColor}80, 0 4px 8px rgba(0,0,0,0.3);
            }
          }
        `}
      </style>
    </div>,
    document.body
  );
} 