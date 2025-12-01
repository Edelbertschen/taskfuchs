import React, { createContext, useContext, useState, useCallback } from 'react';
import { Celebration } from '../components/Common/Celebration';
import { useApp } from './AppContext';
import { playCompletionSound } from '../utils/soundUtils';

interface CelebrationContextType {
  triggerCelebration: () => void;
}

const CelebrationContext = createContext<CelebrationContextType | null>(null);

export function CelebrationProvider({ children }: { children: React.ReactNode }) {
  const { state } = useApp();
  const [showCelebration, setShowCelebration] = useState(false);

  const triggerCelebration = useCallback(() => {
    // Only trigger if celebration is enabled in preferences
    if (state.preferences.enableCelebration) {
      setShowCelebration(true);
    }
    
    // Play sound if enabled (independent of celebration animation)
    if (state.preferences.sounds) {
      playCompletionSound(state.preferences.completionSound, state.preferences.soundVolume).catch(console.warn);
    }
  }, [state.preferences.enableCelebration, state.preferences.sounds, state.preferences.completionSound, state.preferences.soundVolume]);

  const handleCelebrationComplete = useCallback(() => {
    setShowCelebration(false);
  }, []);

  return (
    <CelebrationContext.Provider value={{ triggerCelebration }}>
      {children}
      {showCelebration && (
        <Celebration 
          isVisible={showCelebration} 
          onComplete={handleCelebrationComplete} 
        />
      )}
    </CelebrationContext.Provider>
  );
}

export function useCelebration() {
  const context = useContext(CelebrationContext);
  if (!context) {
    throw new Error('useCelebration must be used within a CelebrationProvider');
  }
  return context;
}

