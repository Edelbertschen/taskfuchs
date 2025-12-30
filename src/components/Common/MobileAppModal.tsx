import React from 'react';
import { createPortal } from 'react-dom';
import { X, Smartphone, Zap, Download, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from 'react-i18next';

interface MobileAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileAppModal({ isOpen, onClose }: MobileAppModalProps) {
  const { state } = useApp();
  const { i18n } = useTranslation();
  
  const accentColor = state.preferences?.accentColor || '#0ea5e9';
  const isDark = document.documentElement.classList.contains('dark');
  const isGerman = i18n.language === 'de';

  const handleClose = () => {
    markMobileAppModalAsSeen();
    onClose();
  };

  const features = [
    {
      de: 'Immer und überall verfügbar – auch offline',
      en: 'Always available – even offline'
    },
    {
      de: 'Schneller Zugriff auf deine Aufgaben',
      en: 'Quick access to your tasks'
    },
    {
      de: 'Native App-Erfahrung auf iOS & Android',
      en: 'Native app experience on iOS & Android'
    },
    {
      de: 'Automatische Synchronisation über alle Geräte',
      en: 'Automatic sync across all devices'
    }
  ];

  if (!isOpen) return null;

  const handleInstall = () => {
    // Close modal and let user install via browser prompt
    handleClose();
    // Info: Der Browser zeigt automatisch den Install-Prompt, wenn verfügbar
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-lg flex flex-col rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300"
        style={{
          background: isDark 
            ? 'linear-gradient(135deg, rgba(30,41,59,0.98) 0%, rgba(15,23,42,0.98) 100%)'
            : 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(250,250,252,0.98) 100%)',
          border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)'
        }}
      >
        {/* Header with Image */}
        <div className="relative">
          {/* Background Gradient */}
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}80 100%)`
            }}
          />
          
          {/* Mobile Mockup Image */}
          <div className="relative pt-8 pb-6 px-6 flex flex-col items-center">
            <div 
              className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 animate-pulse"
              style={{ backgroundColor: `${accentColor}20` }}
            >
              <Smartphone className="w-10 h-10" style={{ color: accentColor }} />
            </div>
            
            <h2 className={`text-2xl font-bold text-center mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {isGerman ? 'TaskFuchs in der Hosentasche' : 'TaskFuchs in Your Pocket'}
            </h2>
            <p className={`text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {isGerman 
                ? 'Installiere die mobile Companion App' 
                : 'Install the mobile companion app'}
            </p>
          </div>

          {/* Close Button */}
          <button
            onClick={handleClose}
            className={`absolute top-4 right-4 p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-black/5 text-gray-500'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 space-y-4">
          {/* Features List */}
          <div className="space-y-3">
            {features.map((feature, index) => (
              <div 
                key={index}
                className={`flex items-start gap-3 p-3 rounded-xl transition-all duration-200 hover:scale-[1.02] ${
                  isDark ? 'bg-gray-800/50' : 'bg-gray-50'
                }`}
              >
                <div 
                  className="p-1.5 rounded-lg flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: `${accentColor}20` }}
                >
                  <Check className="w-4 h-4" style={{ color: accentColor }} />
                </div>
                <p className={`text-sm flex-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {isGerman ? feature.de : feature.en}
                </p>
              </div>
            ))}
          </div>

          {/* Performance Badge */}
          <div 
            className={`flex items-center gap-2 p-3 rounded-xl border ${
              isDark 
                ? 'bg-blue-900/20 border-blue-700/30' 
                : 'bg-blue-50 border-blue-200/50'
            }`}
          >
            <Zap className="w-5 h-5 text-blue-500" />
            <p className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
              {isGerman 
                ? 'Optimiert für iOS, Android und Desktop' 
                : 'Optimized for iOS, Android and Desktop'}
            </p>
          </div>

          {/* Installation Instructions */}
          <div 
            className={`p-4 rounded-xl ${
              isDark ? 'bg-gray-800/30' : 'bg-gray-100/50'
            }`}
          >
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              <strong>{isGerman ? 'So installierst du:' : 'How to install:'}</strong><br />
              <span className="mt-1 block">
                {isGerman 
                  ? 'iOS: Teilen → Zum Home-Bildschirm' 
                  : 'iOS: Share → Add to Home Screen'}<br />
                {isGerman 
                  ? 'Android: Menü → App installieren' 
                  : 'Android: Menu → Install app'}
              </span>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleClose}
              className={`flex-1 py-3 rounded-xl font-medium transition-all hover:opacity-80 active:scale-[0.98] ${
                isDark 
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {isGerman ? 'Später' : 'Later'}
            </button>
            <button
              onClick={handleInstall}
              className="flex-1 py-3 rounded-xl text-white font-medium transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2"
              style={{ backgroundColor: accentColor }}
            >
              <Download className="w-4 h-4" />
              {isGerman ? 'Jetzt installieren' : 'Install now'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Helper function to check if mobile app modal should be shown
export function shouldShowMobileAppModal(): boolean {
  // Only show on desktop/tablet (not on already installed PWA)
  const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                (window.navigator as any).standalone === true;
  
  if (isPWA) return false; // Already installed as PWA
  
  const seen = localStorage.getItem('taskfuchs-mobile-app-modal-seen');
  return seen !== 'true';
}

export function markMobileAppModalAsSeen() {
  localStorage.setItem('taskfuchs-mobile-app-modal-seen', 'true');
}

export default MobileAppModal;

