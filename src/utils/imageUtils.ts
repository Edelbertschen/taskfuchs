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
 * Read current asset version used to bust caches after SW updates
 */
export const getAssetVersion = (): string => {
  try {
    return localStorage.getItem('tf_asset_v') || '';
  } catch {
    return '';
  }
};

/**
 * Get a versioned image path (adds ?v=timestamp if available) for web
 */
export const getVersionedImagePath = (imagePath: string): string => {
  const base = getImagePath(imagePath);
  if (isElectron()) return base;
  const v = getAssetVersion();
  return v ? `${base}?v=${v}` : base;
};

/**
 * Get the TaskFuchs logo path
 */
export const getFuchsImagePath = (): string => {
  return getVersionedImagePath('3d_fox.png');
};

/**
 * Get onboarding image path by index
 */
export const getOnboardingImagePath = (index: number): string => {
  return getImagePath(`onboarding${index}.svg`);
}; 