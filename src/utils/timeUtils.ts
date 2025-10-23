// Shared time formatting utilities for consistent timer display
// Always render with seconds as hh:mm:ss or mm:ss, without any trailing digits

export function formatTimeWithSecondsExact(minutes: number): string {
  try {
    // Debug: Log the input to understand what we're receiving
    if (typeof minutes === 'string') {
      console.warn('⚠️ formatTimeWithSecondsExact received STRING instead of number:', minutes);
      minutes = parseFloat(minutes);
    }
    
    // Safeguard: ensure input is valid
    if (typeof minutes !== 'number' || isNaN(minutes) || !isFinite(minutes)) {
      console.warn('⚠️ formatTimeWithSecondsExact received invalid input:', minutes);
      return '00:00';
    }
    
    // Work with positive value
    const isNegative = minutes < 0;
    const absMinutes = Math.abs(minutes);
    
    // Convert to total seconds (no floating point math)
    let totalSeconds = Math.round(absMinutes * 60);
    
    // Safety: cap at reasonable max (99:59:59)
    if (totalSeconds > 359999) totalSeconds = 359999;
    
    // Calculate components
    const hours = Math.floor(totalSeconds / 3600);
    let remaining = totalSeconds % 3600;
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    
    // Format with strict 2-digit padding
    const formatPart = (n: number) => {
      const str = Math.floor(Math.max(0, Math.min(99, n))).toString();
      return str.length === 1 ? `0${str}` : str;
    };
    
    const sign = isNegative ? '-' : '';
    
    if (hours > 0) {
      const result = `${sign}${formatPart(hours)}:${formatPart(mins)}:${formatPart(secs)}`;
      // Debug if result looks wrong
      if (result.includes('00') && result.length > 8) {
        console.warn('⚠️ Unusual result format:', result, 'from input:', minutes);
      }
      return result;
    }
    
    const result = `${sign}${formatPart(mins)}:${formatPart(secs)}`;
    return result;
  } catch (e) {
    console.error('formatTimeWithSecondsExact error:', e);
    return '00:00';
  }
}


