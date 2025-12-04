export function isStandalonePWA(): boolean {
  try {
    // iOS Safari
    const iosStandalone = (window.navigator as any).standalone === true;
    // General PWA display-mode
    const displayModeMatch = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
    return iosStandalone || displayModeMatch;
  } catch {
    return false;
  }
}

export function isMobileViewport(): boolean {
  try {
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
    const isRealMobileUA = /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(ua);
    const narrow = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
    // Require BOTH: mobile UA and narrow viewport to avoid desktop false positives
    return isRealMobileUA && narrow;
  } catch {
    return false;
  }
}

export function isMobilePWAEnvironment(): boolean {
  // Debug: Allow forcing mobile view with ?mobile=true query param (dev only)
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mobile') === 'true') {
      return true;
    }
  }
  
  // Mobile companion app - works in browser AND as installed PWA
  // PWA has offline read-only capability via IndexedDB cache
  const ua = (navigator.userAgent || '').toLowerCase();
  const isMobileUA = /android|iphone|ipad|ipod|mobile|windows phone/.test(ua);
  
  // Show mobile companion on:
  // 1. Mobile device with narrow viewport (browser)
  // 2. Installed PWA on mobile device
  if (isStandalonePWA() && isMobileUA) {
    return true;
  }
  
  return isMobileViewport();
}


