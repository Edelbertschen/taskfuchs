import React from 'react';
import { useApp } from '../../context/AppContext';
import { getAssetVersion } from '../../utils/imageUtils';

export function MobileComingSoon() {
  const { state } = useApp();
  const accent = state.preferences.accentColor || '#3b82f6';

  const assetVersion = getAssetVersion();

  return (
    <div className="w-full h-full flex items-center justify-center p-6" style={{ background: 'linear-gradient(180deg, rgba(17,24,39,0.85), rgba(17,24,39,0.95))' }}>
      <div className="max-w-sm w-full bg-white/10 dark:bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-6 text-center">
        <div className="w-20 h-20 mx-auto rounded-2xl mb-4" style={{ backgroundImage: `url(/foxicon-512.png${assetVersion ? `?v=${assetVersion}` : ''})`, backgroundSize: 'cover', backgroundPosition: 'center', boxShadow: `0 8px 30px ${accent}40` }} />
        <h2 className="text-xl font-semibold text-white mb-2">TaskFuchs Mobil</h2>
        <p className="text-white/80 text-sm mb-4">Die mobile Version wird in Kürze verfügbar sein. Wir arbeiten an einer erstklassigen mobilen Erfahrung.</p>
        <div className="text-white/70 text-xs mb-6">Nutze TaskFuchs bis dahin am Desktop.</div>
        <button className="px-4 py-2 rounded-xl text-white" style={{ backgroundColor: accent }} onClick={() => window.location.reload()}>
          Neu laden
        </button>
      </div>
    </div>
  );
}


