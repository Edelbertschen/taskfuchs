import React, { useState, useEffect } from 'react';
import { Play, Users } from 'lucide-react';
import { getFuchsImagePath } from '../../utils/imageUtils';

interface LandingPageProps {
  onLogin: () => void;
  onGuestLogin: () => void;
}

export function LandingPage({ onLogin, onGuestLogin }: LandingPageProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50 flex items-center justify-center">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-orange-400/20 to-red-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-60 right-20 w-96 h-96 bg-gradient-to-br from-orange-300/15 to-yellow-300/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-40 left-1/3 w-64 h-64 bg-gradient-to-br from-red-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Central Hero Section */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        <div className={`transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
          {/* Logo */}
          <div className="flex justify-center mb-12">
            <img
              src={getFuchsImagePath()}
              alt="TaskFuchs Logo"
              className="w-24 h-24"
            />
          </div>

          {/* Main Headline */}
          <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent font-black">
              TaskFuchs
            </span>
            <br />
            <span className="text-gray-900">Zähme das Chaos.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-gray-600 mb-12 leading-relaxed max-w-3xl mx-auto">
            Die ultimative Aufgabenverwaltung mit Pomodoro-Timer und nahtloser 
            Integration in deine bestehenden Workflows.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {/* Primary Button - Jetzt kostenlos starten */}
            <button
              onClick={onGuestLogin}
              className="group relative bg-gradient-to-r from-orange-600 to-red-600 text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 flex items-center space-x-3 min-w-[280px] justify-center"
            >
              <Play className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              <span>Jetzt kostenlos starten</span>
              <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>

            {/* Secondary Button - Anmelden */}
            <button
              onClick={onLogin}
              className="group bg-white text-orange-600 px-8 py-4 rounded-2xl font-semibold text-lg border-2 border-orange-200 hover:border-orange-300 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center space-x-3 min-w-[200px] justify-center"
            >
              <Users className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              <span>Anmelden</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 