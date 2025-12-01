import React, { useState, useEffect } from 'react';

interface AppLoadingScreenProps {
  message?: string;
}

export function AppLoadingScreen({ message = 'Loading...' }: AppLoadingScreenProps) {
  // Detect system dark mode preference
  const [isDarkMode, setIsDarkMode] = useState(() => 
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Apply dark mode class to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background image - bg14 for light, bg15 for dark */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-500"
        style={{
          backgroundImage: `url(${isDarkMode ? '/backgrounds/bg15.png' : '/backgrounds/bg14.png'})`,
          backgroundAttachment: 'fixed'
        }}
      />
      
      {/* Subtle overlay for better contrast */}
      <div className={`absolute inset-0 ${isDarkMode ? 'bg-black/30' : 'bg-white/10'}`} />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* 3D Fox Logo with pulse animation */}
        <div className="relative">
          <img 
            src={isDarkMode ? '/3d_fox_dark.png' : '/3d_fox_light.png'}
            alt="TaskFuchs" 
            className="w-32 h-32 object-contain drop-shadow-lg animate-pulse"
          />
          
          {/* Loading spinner around the logo */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div 
              className="w-40 h-40 border-4 border-transparent border-t-orange-500 rounded-full animate-spin"
              style={{ animationDuration: '1.5s' }}
            />
          </div>
        </div>

        {/* App name */}
        <h1 className={`text-2xl font-bold tracking-tight mt-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          TaskFuchs
        </h1>

        {/* Loading message */}
        <p className={`mt-4 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          {message}
        </p>

        {/* Animated dots */}
        <div className="flex space-x-1 mt-2">
          <div 
            className={`w-2 h-2 rounded-full ${isDarkMode ? 'bg-orange-400' : 'bg-orange-500'} animate-bounce`}
            style={{ animationDelay: '0ms' }}
          />
          <div 
            className={`w-2 h-2 rounded-full ${isDarkMode ? 'bg-orange-400' : 'bg-orange-500'} animate-bounce`}
            style={{ animationDelay: '150ms' }}
          />
          <div 
            className={`w-2 h-2 rounded-full ${isDarkMode ? 'bg-orange-400' : 'bg-orange-500'} animate-bounce`}
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
    </div>
  );
}

export default AppLoadingScreen;

