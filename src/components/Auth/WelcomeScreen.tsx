import React, { useEffect } from 'react';

interface WelcomeScreenProps {
  onGuestMode: () => void;
}

export function WelcomeScreen({ onGuestMode }: WelcomeScreenProps) {
  // For all users (web and desktop), skip the old landing page and go directly to guest mode
  // The new SplashModal and OnboardingTour in MainApp will handle the welcome experience
  useEffect(() => {
    // Small delay for smooth transition
    const timer = setTimeout(() => {
      onGuestMode();
    }, 100);
    return () => clearTimeout(timer);
  }, [onGuestMode]);

  // Show a brief loading state while transitioning
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <img 
          src="/3d_fox.png" 
          alt="TaskFuchs" 
          className="w-20 h-20 mx-auto mb-4 animate-bounce"
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            if (img.src.includes('/3d_fox.png')) img.src = './3d_fox.png';
          }}
        />
        <div className="text-xl font-bold text-gray-900 dark:text-white">TaskFuchs</div>
      </div>
    </div>
  );
} 