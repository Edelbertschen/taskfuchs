import React, { useState, useEffect } from 'react';
import { getFuchsImagePath, getImagePath } from '../../utils/imageUtils';

interface LandingPageProps {
  onGuestLogin: () => void;
}

export function LandingPage({ onGuestLogin }: LandingPageProps) {
  const [accentColor, setAccentColor] = useState<string>('#ef4444');
  const [showClaim, setShowClaim] = useState<boolean>(true);

  // Resolve accent color from storage or CSS var
  useEffect(() => {
    const getAccent = () => {
      try {
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('accentColor');
          if (stored) return stored;
          const cssVar = getComputedStyle(document.documentElement).getPropertyValue('--accent-color')?.trim();
          if (cssVar) return cssVar;
        }
      } catch {}
      return '#ef4444';
    };
    setAccentColor(getAccent());
  }, []);

  // Fade out claim after 3s, then continue to app shortly after
  useEffect(() => {
    const t1 = setTimeout(() => setShowClaim(false), 3000);
    const t2 = setTimeout(() => onGuestLogin(), 3600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onGuestLogin]);

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Subtle background with elegant vignette */}
      <div className="absolute inset-0" aria-hidden="true">
        <div className="w-full h-full bg-white dark:bg-gray-950" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            background: `radial-gradient(60rem 60rem at 50% 35%, ${accentColor}, transparent 60%)`,
          }}
        />
      </div>

      {/* Centered mark */}
      <div className="relative z-10 text-center px-8">
        <div className="mx-auto mb-8 w-28 h-28 rounded-full flex items-center justify-center" style={{ boxShadow: '0 1px 0 rgba(0,0,0,0.02)' }}>
          <img
            src={getFuchsImagePath()}
            alt="TaskFuchs"
            className="w-24 h-24 object-contain select-none"
            draggable={false}
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = getImagePath('Fuchs.svg'); }}
          />
        </div>

        <div className="mb-3">
          <span
            className="text-[clamp(44px,7vw,96px)] font-semibold tracking-tight leading-none"
            style={{ color: 'inherit' }}
          >
            TaskFuchs
          </span>
        </div>
        <div className="mx-auto mb-8 h-[3px] w-[180px] rounded-full" style={{ backgroundColor: accentColor }} />

        <div
          className={`text-[clamp(16px,2.2vw,22px)] text-gray-500 dark:text-gray-300 transition-opacity duration-700 ease-out`}
          style={{ opacity: showClaim ? 1 : 0 }}
        >
          Dein Tag, dein Revier.
        </div>
      </div>
    </div>
  );
}