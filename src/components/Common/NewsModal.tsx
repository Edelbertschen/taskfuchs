import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Wand2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from 'react-i18next';

const NEWS_VERSION = 'ai-launch-2024-12';

interface NewsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewsModal({ isOpen, onClose }: NewsModalProps) {
  const { state } = useApp();
  const { i18n } = useTranslation();
  const [isAnimating, setIsAnimating] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  
  const accentColor = state.preferences?.accentColor || '#0ea5e9';
  const isDark = document.documentElement.classList.contains('dark');
  const isGerman = i18n.language === 'de';

  const handleClose = () => {
    setIsAnimating(true);
    if (dontShowAgain) {
      localStorage.setItem(`taskfuchs-news-${NEWS_VERSION}`, 'seen');
    }
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const getFoxImagePath = () => {
    return '/3d_fox.png';
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div 
        className={`relative w-full max-w-md mx-4 rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 ${
          isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}
        style={{
          background: isDark 
            ? 'linear-gradient(135deg, rgba(30,41,59,0.98) 0%, rgba(15,23,42,0.98) 100%)'
            : 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(250,250,252,0.98) 100%)',
          border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)',
          animation: !isAnimating ? 'modalIn 0.4s ease-out' : undefined
        }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className={`absolute top-4 right-4 p-2 rounded-full transition-colors z-10 ${
            isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-black/5 text-gray-500'
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Decorative gradient top */}
        <div 
          className="h-2 w-full"
          style={{ background: `linear-gradient(90deg, ${accentColor}, ${accentColor}80)` }}
        />

        {/* Fox with sparkles */}
        <div className="flex justify-center pt-6 pb-2">
          <div className="relative">
            <img 
              src={getFoxImagePath()}
              alt="TaskFuchs" 
              className="w-28 h-28 object-contain"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (img.src.includes('/3d_fox.png')) img.src = './3d_fox.png';
              }}
              style={{ 
                animation: 'float 3s ease-in-out infinite',
                filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.15))'
              }}
            />
            <Sparkles 
              className="absolute -top-1 -right-1 w-5 h-5"
              style={{ color: accentColor, animation: 'pulse 2s ease-in-out infinite' }}
            />
            <Sparkles 
              className="absolute -bottom-0 -left-2 w-4 h-4"
              style={{ color: accentColor, animation: 'pulse 2s ease-in-out infinite 0.5s' }}
            />
          </div>
        </div>

        {/* News Badge */}
        <div className="flex justify-center mb-3">
          <span 
            className="px-3 py-1 rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: accentColor }}
          >
            {isGerman ? '✨ NEU' : '✨ NEW'}
          </span>
        </div>

        {/* Content */}
        <div className="text-center px-6 pb-4">
          <h2 className={`text-2xl font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {isGerman ? 'KI-Aufgabenerfassung' : 'AI Task Capture'}
          </h2>
          
          <p className={`text-base mb-4 leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            {isGerman 
              ? 'Beschreibe deine Aufgaben einfach in natürlicher Sprache – die KI erkennt automatisch Datum, Priorität, Dauer und Projekt. Mehrere Aufgaben auf einmal? Kein Problem!'
              : 'Simply describe your tasks in natural language – AI automatically detects date, priority, duration and project. Multiple tasks at once? No problem!'
            }
          </p>

          {/* Feature highlight */}
          <div 
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl mb-4"
            style={{ backgroundColor: `${accentColor}15` }}
          >
            <Wand2 className="w-5 h-5" style={{ color: accentColor }} />
            <span className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
              {isGerman 
                ? 'Klicke auf den Zauberstab-Button beim Erstellen einer Aufgabe'
                : 'Click the wand button when creating a task'
              }
            </span>
          </div>
        </div>

        {/* Don't show again checkbox */}
        <div className="px-6 pb-4">
          <label className={`flex items-center justify-center gap-2 cursor-pointer ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
              style={{ accentColor }}
            />
            <span className="text-sm">
              {isGerman ? 'Nicht mehr anzeigen' : 'Don\'t show again'}
            </span>
          </label>
        </div>

        {/* Button */}
        <div className="px-6 pb-6">
          <button
            onClick={handleClose}
            className="w-full py-3 rounded-xl text-white font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ backgroundColor: accentColor }}
          >
            {isGerman ? 'Verstanden!' : 'Got it!'}
          </button>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes modalIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>,
    document.body
  );
}

// Helper to check if news should be shown
export function shouldShowNews(): boolean {
  const seen = localStorage.getItem(`taskfuchs-news-${NEWS_VERSION}`);
  return seen !== 'seen';
}

export default NewsModal;

