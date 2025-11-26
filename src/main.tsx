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

// PWA-Update-Banner: Nutzer entscheidet, wann aktualisiert wird
// KEINE automatischen Aktualisierungen - nur Benachrichtigung

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  // @ts-ignore
  import('virtual:pwa-register').then(({ registerSW }) => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        console.log('[PWA] New version available - showing notification');
        // Speichere Update-Funktion für manuellen Aufruf durch Nutzer
        try { (window as any).__taskfuchs_applyUpdate = () => updateSW(true); } catch {}
        // Zeige Nutzer die Update-Benachrichtigung
        window.dispatchEvent(new CustomEvent('pwa-update-available'));
      },
      onOfflineReady() {
        console.log('[PWA] App ready for offline use');
        window.dispatchEvent(new CustomEvent('pwa-offline-ready'));
      },
      onRegisteredSW(swUrl, registration) {
        console.log('[PWA] Service Worker registered:', swUrl);
        // Check if there's already a waiting SW when the app loads
        if (registration?.waiting) {
          console.log('[PWA] Waiting SW found on load - showing notification');
          try { (window as any).__taskfuchs_applyUpdate = () => updateSW(true); } catch {}
          window.dispatchEvent(new CustomEvent('pwa-update-available'));
        }
      }
    });

    // Listen for SW state changes to detect updates
    navigator.serviceWorker.ready.then((registration) => {
      // Check if there's already a waiting worker
      if (registration.waiting) {
        console.log('[PWA] SW already waiting - showing notification');
        try { (window as any).__taskfuchs_applyUpdate = () => updateSW(true); } catch {}
        window.dispatchEvent(new CustomEvent('pwa-update-available'));
      }
      
      // Listen for new updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] New SW installed - showing notification');
              try { (window as any).__taskfuchs_applyUpdate = () => updateSW(true); } catch {}
              window.dispatchEvent(new CustomEvent('pwa-update-available'));
            }
          });
        }
      });
    });

    // NICHT automatisch neu laden bei Controller-Wechsel
    // Das passiert nur wenn der Nutzer auf "Jetzt aktualisieren" klickt
    let isUpdating = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (isUpdating) return; // Prevent multiple reloads
      isUpdating = true;
      console.log('[PWA] Controller changed - reloading');
      try { localStorage.setItem('tf_asset_v', String(Date.now())); } catch {}
      try { window.location.reload(); } catch {}
    });

    // Prüfe einmalig nach Updates (ohne automatische Aktivierung)
    const checkForUpdates = async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          try { await reg.update(); } catch {}
          // KEINE automatische SKIP_WAITING - Nutzer entscheidet
        }
      } catch {}
    };

    // Einmalig nach dem Laden auf Updates prüfen
    setTimeout(checkForUpdates, 3000);
  }).catch((err) => {
    console.error('[PWA] Registration failed:', err);
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
