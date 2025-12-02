import type { UserPreferences } from '../types';

export interface BackgroundStyles {
  backgroundImage?: string;
  backgroundColor?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
  backgroundRepeat?: string;
  backgroundAttachment?: string;
  filter?: string;
  WebkitFilter?: string;
}

export function getBackgroundStyles(preferences: UserPreferences): BackgroundStyles {
  const backgroundType = preferences.backgroundType || 'image';
  
  switch (backgroundType) {
    case 'image':
      if (preferences.backgroundImage) {
        return {
          backgroundImage: `url(${preferences.backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        };
      }
      // Default gray background if no image is set
      return {
        backgroundColor: 'rgb(249, 250, 251)' // bg-gray-50 equivalent
      };
    
    case 'color':
      return {
        backgroundColor: preferences.backgroundColor || 'rgb(249, 250, 251)'
      };
    
    case 'gradient':
      const gradientFrom = preferences.gradientFrom || '#f3f4f6';
      const gradientTo = preferences.gradientTo || '#e5e7eb';
      const gradientDirection = preferences.gradientDirection || 'to bottom right';
      
      return {
        backgroundImage: `linear-gradient(${gradientDirection}, ${gradientFrom}, ${gradientTo})`
      };
    
    default:
      return {
        backgroundColor: 'rgb(249, 250, 251)'
      };
  }
}

export function getDarkModeBackgroundStyles(preferences: UserPreferences): BackgroundStyles {
  const backgroundType = preferences.backgroundType || 'image';
  
  switch (backgroundType) {
    case 'image':
      if (preferences.backgroundImage) {
        return {
          backgroundImage: `url(${preferences.backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        };
      }
      return {
        backgroundColor: 'rgb(17, 24, 39)' // bg-gray-900 equivalent
      };
    
    case 'color':
      // For dark mode, darken the color or use a dark equivalent
      const lightColor = preferences.backgroundColor || '#f3f4f6';
      return {
        backgroundColor: darkenColor(lightColor)
      };
    
    case 'gradient':
      const gradientFrom = darkenColor(preferences.gradientFrom || '#374151');
      const gradientTo = darkenColor(preferences.gradientTo || '#1f2937');
      const gradientDirection = preferences.gradientDirection || 'to bottom right';
      
      return {
        backgroundImage: `linear-gradient(${gradientDirection}, ${gradientFrom}, ${gradientTo})`
      };
    
    default:
      return {
        backgroundColor: 'rgb(17, 24, 39)'
      };
  }
}

function darkenColor(color: string): string {
  // Simple color darkening - convert to darker equivalent for dark mode
  if (color.startsWith('#')) {
    // Convert hex to RGB, then darken
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    
    // Darken by reducing each component by about 60%
    const darkR = Math.floor(r * 0.4);
    const darkG = Math.floor(g * 0.4);
    const darkB = Math.floor(b * 0.4);
    
    return `rgb(${darkR}, ${darkG}, ${darkB})`;
  }
  
  // Fallback for other color formats or invalid colors
  return 'rgb(17, 24, 39)'; // bg-gray-900
}

export function getBackgroundOverlayStyles(preferences: UserPreferences, isDarkMode: boolean): React.CSSProperties {
  const backgroundType = preferences.backgroundType || 'image';
  
  if (backgroundType === 'image' && preferences.backgroundImage && preferences.backgroundEffects?.overlay === true) {
    const overlayOpacity = preferences.backgroundEffects?.overlayOpacity || 0.4;
    
    return {
      backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})`,
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1
    };
  }
  
  return {};
}

/**
 * Calculate the relative luminance of a color
 * Returns a value between 0 (darkest) and 1 (lightest)
 */
function getLuminance(color: string): number {
  let r: number, g: number, b: number;
  
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    r = parseInt(hex.slice(0, 2), 16) / 255;
    g = parseInt(hex.slice(2, 4), 16) / 255;
    b = parseInt(hex.slice(4, 6), 16) / 255;
  } else if (color.startsWith('rgb')) {
    const match = color.match(/\d+/g);
    if (!match) return 0.5;
    r = parseInt(match[0]) / 255;
    g = parseInt(match[1]) / 255;
    b = parseInt(match[2]) / 255;
  } else {
    return 0.5; // Default to middle for unknown formats
  }
  
  // Convert to linear RGB
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  
  // Calculate relative luminance (WCAG formula)
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Get contrasting text color based on background
 * Returns a color value from white to black depending on background brightness
 */
export function getContrastingTextColor(preferences: UserPreferences, isDarkMode: boolean): string {
  const backgroundType = preferences.backgroundType || 'image';
  
  // For background images, use light text with good shadow (images are usually complex)
  if (backgroundType === 'image' && preferences.backgroundImage) {
    // Most background images are darker/complex, so use light text
    // But some bg images are light (like bg12, bg14, bg22-25)
    const lightBgImages = ['bg12', 'bg14', 'bg22', 'bg23', 'bg24', 'bg25'];
    const isLightBgImage = lightBgImages.some(img => preferences.backgroundImage?.includes(img));
    
    if (isLightBgImage && !isDarkMode) {
      return 'rgb(31, 41, 55)'; // Dark gray for light backgrounds
    }
    return 'rgb(255, 255, 255)'; // White for dark/complex backgrounds
  }
  
  // For solid colors, calculate luminance
  if (backgroundType === 'color' && preferences.backgroundColor) {
    const color = isDarkMode ? darkenColor(preferences.backgroundColor) : preferences.backgroundColor;
    const luminance = getLuminance(color);
    
    // Use dark text on light backgrounds (luminance > 0.5)
    if (luminance > 0.5) {
      return 'rgb(17, 24, 39)'; // Darkest (gray-900)
    } else if (luminance > 0.3) {
      return 'rgb(243, 244, 246)'; // Light gray
    } else {
      return 'rgb(255, 255, 255)'; // White for very dark backgrounds
    }
  }
  
  // For gradients, use the "from" color to estimate
  if (backgroundType === 'gradient') {
    const fromColor = isDarkMode 
      ? darkenColor(preferences.gradientFrom || '#374151')
      : (preferences.gradientFrom || '#f3f4f6');
    const luminance = getLuminance(fromColor);
    
    if (luminance > 0.5) {
      return 'rgb(17, 24, 39)';
    } else if (luminance > 0.3) {
      return 'rgb(243, 244, 246)';
    } else {
      return 'rgb(255, 255, 255)';
    }
  }
  
  // Default: use theme-appropriate colors
  return isDarkMode ? 'rgb(243, 244, 246)' : 'rgb(55, 65, 81)';
} 