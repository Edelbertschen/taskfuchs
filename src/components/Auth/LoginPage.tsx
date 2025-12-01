import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

interface LoginPageProps {
  isProcessingCallback?: boolean;
}

export function LoginPage({ isProcessingCallback = false }: LoginPageProps) {
  const { t, i18n } = useTranslation();
  const { loginWithMicrosoft, state } = useAuth();
  
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

  // Detect browser language on mount
  useEffect(() => {
    const browserLang = navigator.language.toLowerCase();
    const targetLang = browserLang.startsWith('de') ? 'de' : 'en';
    
    // Only change if different and not already stored
    const storedLang = localStorage.getItem('i18nextLng');
    if (!storedLang && i18n.language !== targetLang) {
      i18n.changeLanguage(targetLang);
    }
  }, [i18n]);

  // Apply dark mode class to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleMicrosoftLogin = async () => {
    try {
      await loginWithMicrosoft();
    } catch (error) {
      console.error('Microsoft login failed:', error);
    }
  };

  const handleLanguageChange = (lang: 'de' | 'en') => {
    i18n.changeLanguage(lang);
  };

  // Normalize language for button states
  const currentLang = i18n.language?.slice(0, 2) || 'en';
  
  // Show loading state when auth is loading OR when processing callback
  const isLoading = state.isLoading || isProcessingCallback;

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

      {/* Language Selector - Top Right */}
      <div className="absolute top-6 right-6 z-20 flex gap-1 bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-xl p-1 border border-white/20 dark:border-white/10">
        <button
          onClick={() => handleLanguageChange('de')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
            currentLang === 'de'
              ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
              : 'text-gray-700 dark:text-gray-200 hover:bg-white/20 dark:hover:bg-white/10'
          }`}
        >
          DE
        </button>
        <button
          onClick={() => handleLanguageChange('en')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
            currentLang === 'en'
              ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
              : 'text-gray-700 dark:text-gray-200 hover:bg-white/20 dark:hover:bg-white/10'
          }`}
        >
          EN
        </button>
      </div>

      {/* Main content card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className={`${isDarkMode 
          ? 'bg-gray-900/80 border-white/10' 
          : 'bg-white/80 border-white/40'
        } backdrop-blur-xl rounded-3xl shadow-2xl p-8 md:p-10 border`}>
          
          {/* 3D Fox Logo */}
          <div className="flex flex-col items-center mb-6">
            <img 
              src={isDarkMode ? '/3d_fox_dark.png' : '/3d_fox_light.png'}
              alt="TaskFuchs" 
              className="w-32 h-32 object-contain drop-shadow-lg"
            />
            <h1 className={`text-3xl font-bold tracking-tight mt-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              TaskFuchs
            </h1>
          </div>

          {/* Error message */}
          {state.error && (
            <div className={`mb-6 p-4 rounded-xl text-sm ${
              isDarkMode 
                ? 'bg-red-900/50 border border-red-700/50 text-red-300' 
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {state.error}
            </div>
          )}

          {/* Microsoft Login Button */}
          <button
            onClick={handleMicrosoftLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#2F2F2F] hover:bg-[#1a1a1a] disabled:bg-[#2F2F2F] disabled:opacity-80 text-white font-medium rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:scale-100"
          >
            {isLoading ? (
              <>
                {/* Loading spinner */}
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>
                  {t('login.signingIn', currentLang === 'de' ? 'Anmelden...' : 'Signing in...')}
                </span>
              </>
            ) : (
              <>
                {/* Microsoft Logo */}
                <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none">
                  <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                  <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                  <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                  <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
                </svg>
                <span>
                  {t('login.signInWithMicrosoft', currentLang === 'de' ? 'Mit Microsoft anmelden' : 'Sign in with Microsoft')}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
