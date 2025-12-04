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
  
  // Mobile companion app - only in browser on mobile devices
  // NO standalone PWA mode to ensure proper sync with online app
  // Only show mobile view when accessing via mobile browser (not installed PWA)
  if (isStandalonePWA()) {
    // If running as installed PWA, don't use mobile shell
    // This avoids sync issues - users should use the browser version
    return false;
  }
  
  // Only allow MobileShell for mobile browsers with narrow viewport
  return isMobileViewport();
}


