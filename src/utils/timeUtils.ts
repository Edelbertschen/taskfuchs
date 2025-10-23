// Shared time formatting utilities for consistent timer display
// Always render with seconds as hh:mm:ss or mm:ss, without any trailing digits

export function formatTimeWithSecondsExact(minutes: number): string {
  try {
    if (typeof minutes !== 'number' || isNaN(minutes)) return '00:00';
    const negative = minutes < 0;
    let totalSeconds = Math.floor(Math.abs(minutes) * 60 + 1e-6);
    const hours = Math.floor(totalSeconds / 3600);
    totalSeconds = totalSeconds % 3600;
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    const sign = negative ? '-' : '';
    if (hours > 0) {
      const h = String(hours).padStart(2, '0');
      const m = String(mins).padStart(2, '0');
      const s = String(secs).padStart(2, '0');
      return `${sign}${h}:${m}:${s}`;
    }
    const m = String(mins).padStart(2, '0');
    const s = String(secs).padStart(2, '0');
    return `${sign}${m}:${s}`;
  } catch {
    return '00:00';
  }
}


