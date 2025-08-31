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
  // Only allow MobileShell when:
  // - running standalone PWA on a mobile UA, or
  // - mobile UA with narrow viewport
  const ua = (navigator.userAgent || '').toLowerCase();
  const isMobileUA = /android|iphone|ipad|ipod|mobile|windows phone/.test(ua);
  return (isStandalonePWA() && isMobileUA) || isMobileViewport();
}


