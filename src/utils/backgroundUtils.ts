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
  
  if (backgroundType === 'image' && preferences.backgroundImage && preferences.backgroundEffects?.overlay !== false) {
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