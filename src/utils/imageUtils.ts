/**
 * Utility function to get correct image paths for both web and Electron environments
 */

// Check if we're in Electron environment
const isElectron = (): boolean => {
  return typeof window !== 'undefined' && window.navigator.userAgent.includes('Electron');
};

/**
 * Get the correct image path for the current environment
 * @param imagePath - The image path (e.g., 'Fuchs.svg', 'onboarding1.svg')
 * @returns The correct path for the current environment
 */
export const getImagePath = (imagePath: string): string => {
  // Remove leading slash if present
  const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
  
  if (isElectron()) {
    // In Electron, use relative path
    return `./${cleanPath}`;
  } else {
    // In web, use absolute path
    return `/${cleanPath}`;
  }
};

/**
 * Get the TaskFuchs logo path
 */
export const getFuchsImagePath = (): string => {
  return getImagePath('Fuchs.svg');
};

/**
 * Get onboarding image path by index
 */
export const getOnboardingImagePath = (index: number): string => {
  return getImagePath(`onboarding${index}.svg`);
}; 