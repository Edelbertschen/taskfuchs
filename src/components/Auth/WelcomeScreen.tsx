import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, Clock, Tags, Calendar, Timer, ArrowRight, 
  Play, Pause, Square, BarChart3
} from 'lucide-react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { LandingPage } from './LandingPage';

type AuthMode = 'welcome' | 'login' | 'register';

interface WelcomeScreenProps {
  onGuestMode: () => void;
}

export function WelcomeScreen({ onGuestMode }: WelcomeScreenProps) {
  const [authMode, setAuthMode] = useState<AuthMode>('welcome');
  const [isAnimating, setIsAnimating] = useState(false);

  // Check if we're in a desktop app (Electron) - multiple detection methods
  const isDesktopApp = typeof window !== 'undefined' && (
    ('electron' in window) || 
    ('require' in window) || 
    (!!(window as any).process?.type) ||
    (!!(window as any).process?.versions?.electron) ||
    (navigator.userAgent.includes('Electron')) ||
    (typeof navigator !== 'undefined' && navigator.userAgent.includes('TaskFuchs'))
  );

  // If we're in a desktop app, skip everything and go directly to guest mode
  useEffect(() => {
    if (isDesktopApp) {
      // Desktop-App: Direkt in Guest-Mode ohne Landing Page
      onGuestMode();
    }
  }, [isDesktopApp, onGuestMode]);

  const handleModeChange = (mode: AuthMode) => {
    setIsAnimating(true);
    setTimeout(() => {
      setAuthMode(mode);
      setIsAnimating(false);
    }, 200);
  };

  const handleGuestMode = () => {
    setIsAnimating(true);
    setTimeout(() => {
      onGuestMode();
    }, 200);
  };

  if (authMode === 'login') {
    return (
      <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 transition-opacity duration-200 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
        <LoginForm
          onSwitchToRegister={() => handleModeChange('register')}
          onGuestMode={handleGuestMode}
        />
      </div>
    );
  }

  if (authMode === 'register') {
    return (
      <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 transition-opacity duration-200 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
        <RegisterForm
          onSwitchToLogin={() => handleModeChange('login')}
          onGuestMode={handleGuestMode}
        />
      </div>
    );
  }

  // Only show landing page for web apps, not desktop apps
  if (!isDesktopApp) {
    return <LandingPage onGuestLogin={handleGuestMode} />;
  }

  // This should not happen in desktop apps due to the useEffect above,
  // but return login form as fallback
  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 transition-opacity duration-200 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
      <LoginForm
        onSwitchToRegister={() => handleModeChange('register')}
        onGuestMode={handleGuestMode}
      />
    </div>
  );
} 