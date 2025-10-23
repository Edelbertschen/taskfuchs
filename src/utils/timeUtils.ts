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
    
    // Ensure values are in valid range
    const validMins = Math.max(0, Math.min(59, mins));
    const validSecs = Math.max(0, Math.min(59, secs));
    
    const sign = negative ? '-' : '';
    
    if (hours > 0) {
      const h = String(Math.max(0, Math.min(99, hours))).padStart(2, '0');
      const m = String(validMins).padStart(2, '0');
      const s = String(validSecs).padStart(2, '0');
      // Verify format: should be exactly HH:MM:SS (8 chars + sign)
      const result = `${sign}${h}:${m}:${s}`;
      return result.length === (sign ? 9 : 8) ? result : '00:00:00';
    }
    
    const m = String(validMins).padStart(2, '0');
    const s = String(validSecs).padStart(2, '0');
    // Verify format: should be exactly MM:SS (5 chars + sign)
    const result = `${sign}${m}:${s}`;
    return result.length === (sign ? 6 : 5) ? result : '00:00';
  } catch {
    return '00:00';
  }
}


