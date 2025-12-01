import React from 'react';
import { useApp } from '../../context/AppContext';
import { getAssetVersion } from '../../utils/imageUtils';

export function MobileComingSoon() {
  const { state } = useApp();
  const accent = state.preferences.accentColor || '#e06610';
  const assetVersion = getAssetVersion();

  return (
    <div 
      className="min-h-screen w-full flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{ 
        background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)',
      }}
    >
      {/* Animated background orbs */}
      <div 
        className="absolute w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse"
        style={{ 
          background: `radial-gradient(circle, ${accent}40 0%, transparent 70%)`,
          top: '-10%',
          right: '-20%',
        }}
      />
      <div 
        className="absolute w-80 h-80 rounded-full opacity-15 blur-3xl"
        style={{ 
          background: `radial-gradient(circle, ${accent}30 0%, transparent 70%)`,
          bottom: '10%',
          left: '-15%',
          animation: 'pulse 4s ease-in-out infinite alternate',
        }}
      />

      {/* Main content card */}
      <div className="max-w-sm w-full bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl p-8 text-center relative z-10">
        
        {/* Fox illustration */}
        <div className="relative mb-6">
          <div 
            className="w-48 h-48 mx-auto rounded-2xl overflow-hidden"
            style={{ 
              boxShadow: `0 20px 60px ${accent}25, 0 8px 25px rgba(0,0,0,0.3)`,
            }}
          >
            <img 
              src={`/foxdesk-mobile.webp${assetVersion ? `?v=${assetVersion}` : ''}`}
              alt="TaskFuchs arbeitet fleißig"
              className="w-full h-full object-cover"
              style={{
                animation: 'gentle-float 4s ease-in-out infinite',
              }}
            />
          </div>
          
          {/* Working indicator */}
          <div 
            className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-medium text-white flex items-center gap-2"
            style={{ backgroundColor: accent }}
          >
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            In Arbeit
          </div>
        </div>

        {/* Title */}
        <h1 
          className="text-2xl font-bold mb-3"
          style={{ 
            background: `linear-gradient(135deg, ${accent} 0%, #ff9f43 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Mobil wird noch schöner!
        </h1>

        {/* Description */}
        <p className="text-white/80 text-sm leading-relaxed mb-4">
          Unser fleißiger Fuchs arbeitet gerade an einer richtig guten mobilen Version für dich. 
          Mit liebevollen Details und cleveren Features, die perfekt in deine Hosentasche passen!
        </p>

        {/* Features preview */}
        <div className="flex justify-center gap-3 mb-6">
          <div className="flex items-center gap-1.5 text-white/60 text-xs">
            <span>✨</span> Touch-optimiert
          </div>
          <div className="flex items-center gap-1.5 text-white/60 text-xs">
            <span>🚀</span> Schnell
          </div>
          <div className="flex items-center gap-1.5 text-white/60 text-xs">
            <span>💝</span> Liebevoll
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-6" />

        {/* Desktop hint */}
        <p className="text-white/50 text-xs mb-5">
          🖥️ Bis dahin kannst du TaskFuchs auf dem Desktop in voller Pracht erleben!
        </p>

        {/* Desktop Button */}
        <a 
          href="https://app.taskfuchs.de"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg"
          style={{ 
            backgroundColor: accent,
            boxShadow: `0 4px 20px ${accent}40`,
          }}
        >
          <span>Zur Desktop-Version</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>

        {/* Footer note */}
        <p className="text-white/30 text-xs mt-6">
          🦊 Der Fuchs dankt für deine Geduld!
        </p>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes gentle-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}
