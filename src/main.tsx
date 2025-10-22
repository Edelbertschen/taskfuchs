import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import './utils/reminderTestDebug' // Import reminder debugging utilities
import App from './App.tsx'

// Mark page visible once JS is running to avoid initial flash of UI before state is applied
try {
  document.body.style.visibility = 'visible';
  document.body.setAttribute('data-has-js', 'true');
} catch {}

// PWA-Update-Banner wird ausschließlich in App.tsx via useRegisterSW gehandhabt

// Ensure PWA updates activate on manual reload and focus (no UI)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  // @ts-ignore
  import('virtual:pwa-register').then(({ registerSW }) => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        try { (window as any).__taskfuchs_applyUpdate = () => updateSW(true); } catch {}
        window.dispatchEvent(new CustomEvent('pwa-update-available'));
      },
      onOfflineReady() {
        window.dispatchEvent(new CustomEvent('pwa-offline-ready'));
      },
    });

    // Reload when a new controller takes over
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      try { localStorage.setItem('tf_asset_v', String(Date.now())); } catch {}
      try { window.location.reload(); } catch {}
    });

    const forceActivate = async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          try { await reg.update(); } catch {}
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        }
        // Also trigger plugin helper
        try { updateSW(true); } catch {}
      } catch {}
    };

    // Run once after load and on focus
    setTimeout(forceActivate, 500);
    window.addEventListener('focus', forceActivate);
  }).catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
