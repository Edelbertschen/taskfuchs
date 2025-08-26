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

// PWA Update Banner using vite-plugin-pwa registerSW
function showPWAUpdateBanner(onUpdate: () => void) {
  if (document.getElementById('pwa-update-banner')) return;
  const bar = document.createElement('div');
  bar.id = 'pwa-update-banner';
  bar.style.position = 'fixed';
  bar.style.left = '0';
  bar.style.right = '0';
  bar.style.bottom = '0';
  bar.style.zIndex = '99999';
  bar.style.display = 'flex';
  bar.style.gap = '12px';
  bar.style.justifyContent = 'center';
  bar.style.alignItems = 'center';
  bar.style.padding = '12px 16px';
  bar.style.background = 'rgba(17, 24, 39, 0.9)';
  bar.style.color = '#fff';
  bar.style.backdropFilter = 'saturate(180%) blur(8px)';

  const text = document.createElement('span');
  text.textContent = 'Neue Version verfügbar';
  text.style.fontWeight = '600';

  const refreshBtn = document.createElement('button');
  refreshBtn.textContent = 'Aktualisieren';
  refreshBtn.style.background = 'var(--accent-color)';
  refreshBtn.style.color = '#fff';
  refreshBtn.style.border = '0';
  refreshBtn.style.borderRadius = '9999px';
  refreshBtn.style.padding = '8px 14px';
  refreshBtn.style.fontWeight = '600';
  refreshBtn.style.cursor = 'pointer';
  refreshBtn.onclick = () => onUpdate();

  const laterBtn = document.createElement('button');
  laterBtn.textContent = 'Später';
  laterBtn.style.background = 'transparent';
  laterBtn.style.color = '#fff';
  laterBtn.style.border = '1px solid rgba(255,255,255,0.3)';
  laterBtn.style.borderRadius = '9999px';
  laterBtn.style.padding = '8px 12px';
  laterBtn.style.cursor = 'pointer';
  laterBtn.onclick = () => bar.remove();

  bar.append(text, refreshBtn, laterBtn);
  document.body.appendChild(bar);
}

if (import.meta.env.PROD) {
  // Use dynamic import to avoid dev errors if plugin is not active
  import('virtual:pwa-register')
    .then(({ registerSW }) => {
      const updateSW = registerSW({
        onNeedRefresh() {
          showPWAUpdateBanner(() => updateSW());
        },
        onOfflineReady() {
          // Optionally notify offline readiness
        },
      });
    })
    .catch((err) => console.warn('PWA register failed', err));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
