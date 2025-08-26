import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { getFuchsImagePath } from '../../utils/imageUtils';

interface LoadingScreenProps {
  isVisible: boolean;
  message?: string;
}

export function LoadingScreen({ isVisible, message = "TaskFuchs wird geladen..." }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (isVisible) {
      // Simulate loading progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + Math.random() * 15;
        });
      }, 200);

      // Animate dots
      const dotsInterval = setInterval(() => {
        setDots(prev => {
          if (prev === '...') return '';
          return prev + '.';
        });
      }, 500);

      return () => {
        clearInterval(progressInterval);
        clearInterval(dotsInterval);
      };
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1600] bg-gradient-to-br from-orange-50 via-white to-red-50 flex items-center justify-center" style={{ isolation: 'isolate' }}>
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-gradient-to-br from-orange-400/20 to-red-400/20 rounded-full blur-2xl animate-ping"></div>
        <div className="absolute top-3/4 right-1/4 w-24 h-24 bg-gradient-to-br from-red-400/20 to-orange-400/20 rounded-full blur-xl animate-ping" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-40 h-40 bg-gradient-to-br from-orange-300/15 to-yellow-300/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 text-center">
        {/* Logo with Animation */}
        <div className="mb-8 flex justify-center">
          <div className="relative group">
            {/* Glowing Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-500 rounded-full blur-lg opacity-75 animate-pulse"></div>
            
            {/* Logo Container */}
            <div className="relative bg-white p-6 rounded-full shadow-lg">
                          <img 
              src={getFuchsImagePath()} 
              alt="TaskFuchs" 
              className="w-20 h-20 animate-bounce"
              style={{ animationDuration: '2s' }}
            />
            </div>

            {/* Rotating Ring */}
            <div className="absolute inset-0 border-4 border-transparent border-t-orange-500 border-r-red-500 rounded-full animate-spin" style={{ animationDuration: '3s' }}></div>
          </div>
        </div>

        {/* TaskFuchs Title */}
        <h1 className="text-4xl font-bold mb-2">
          <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            TaskFuchs
          </span>
        </h1>

        {/* Loading Message */}
        <p className="text-lg text-gray-600 mb-8">
          {message}
          <span className="inline-block w-8 text-left">{dots}</span>
        </p>

        {/* Progress Bar */}
        <div className="w-64 mx-auto mb-4">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-300 ease-out"
              style={{ 
                width: `${Math.min(progress, 100)}%`,
                                  boxShadow: '0 2px 4px rgba(249, 115, 22, 0.2)'
              }}
            ></div>
          </div>
          <div className="text-center mt-2 text-sm text-gray-500">
            {Math.min(Math.round(progress), 100)}%
          </div>
        </div>

        {/* Loading Features */}
        <div className="text-sm text-gray-500 space-y-1">
          <div className={`transition-opacity duration-500 ${progress > 20 ? 'opacity-100' : 'opacity-0'}`}>
            ✓ Aufgaben werden geladen
          </div>
          <div className={`transition-opacity duration-500 ${progress > 40 ? 'opacity-100' : 'opacity-0'}`}>
            ✓ Einstellungen werden angewendet
          </div>
          <div className={`transition-opacity duration-500 ${progress > 60 ? 'opacity-100' : 'opacity-0'}`}>
            ✓ Benutzeroberfläche wird vorbereitet
          </div>
          <div className={`transition-opacity duration-500 ${progress > 80 ? 'opacity-100' : 'opacity-0'}`}>
            ✓ Fast fertig...
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
} 