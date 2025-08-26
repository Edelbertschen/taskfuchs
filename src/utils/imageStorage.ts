import type { StoredImage, ImageStorageState, ImageReference } from '../types';

// Default image storage configuration
export const DEFAULT_IMAGE_STORAGE_CONFIG: ImageStorageState = {
  images: [],
  totalSize: 0,
  maxSize: 100 * 1024 * 1024, // 100MB
  autoCleanup: true,
  cleanupAfterDays: 30,
  compressionQuality: 0.8,
  maxImageSize: 10 * 1024 * 1024, // 10MB
};

// Storage key for localStorage
const STORAGE_KEY = 'taskfuchs_image_storage';

/**
 * Load image storage from localStorage
 */
export function loadImageStorage(): ImageStorageState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...DEFAULT_IMAGE_STORAGE_CONFIG,
        ...parsed,
        // Recalculate total size in case it's out of sync
        totalSize: parsed.images?.reduce((total: number, img: StoredImage) => total + img.size, 0) || 0,
      };
    }
  } catch (error) {
    console.error('Failed to load image storage:', error);
  }
  return { ...DEFAULT_IMAGE_STORAGE_CONFIG };
}

/**
 * Save image storage to localStorage
 */
export function saveImageStorage(storage: ImageStorageState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
  } catch (error) {
    console.error('Failed to save image storage:', error);
    throw new Error('Speicher voll! Bitte lösche einige Bilder.');
  }
}

/**
 * Generate a unique ID for images
 */
export function generateImageId(): string {
  return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get image dimensions from base64 data
 */
export function getImageDimensions(base64Data: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = reject;
    img.src = base64Data;
  });
}

/**
 * Compress image if needed
 */
export function compressImage(
  file: File, 
  quality: number = 0.8, 
  maxSize: number = 10 * 1024 * 1024
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Handle SVG files separately - they don't need compression
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }
    
    if (file.size <= maxSize && file.type !== 'image/png') {
      // If file is already small enough and not PNG, just convert to base64
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions if image is too large
      let { width, height } = img;
      const maxDimension = 2048; // Max 2048px on any side
      
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = (height * maxDimension) / width;
          width = maxDimension;
        } else {
          width = (width * maxDimension) / height;
          height = maxDimension;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);
      
      // Convert to JPEG with compression
      const compressed = canvas.toDataURL('image/jpeg', quality);
      
      // Check if compressed version is actually smaller
      const originalSize = file.size;
      const compressedSize = Math.round((compressed.length - 'data:image/jpeg;base64,'.length) * 0.75);
      
      if (compressedSize < originalSize || originalSize > maxSize) {
        resolve(compressed);
      } else {
        // Original is smaller, use it
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      }
    };

    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Add image to storage
 */
export async function addImageToStorage(
  file: File,
  storage: ImageStorageState
): Promise<{ image: StoredImage; updatedStorage: ImageStorageState }> {
  // Check file size limit
  if (file.size > storage.maxImageSize) {
    throw new Error(`Bild ist zu groß! Maximum: ${formatFileSize(storage.maxImageSize)}`);
  }

  // Check storage limit
  if (storage.totalSize + file.size > storage.maxSize) {
    throw new Error(`Speicher voll! Verfügbar: ${formatFileSize(storage.maxSize - storage.totalSize)}`);
  }

  // Compress image
  const compressedData = await compressImage(file, storage.compressionQuality, storage.maxImageSize);
  const dimensions = await getImageDimensions(compressedData);
  
  // Calculate actual size of base64 data
  const actualSize = Math.round((compressedData.length - compressedData.indexOf(',') - 1) * 0.75);

  const imageId = generateImageId();
  const image: StoredImage = {
    id: imageId,
    filename: `${imageId}.${getFileExtension(file.type)}`,
    originalName: file.name,
    data: compressedData,
    mimeType: file.type === 'image/svg+xml' ? 'image/svg+xml' : 'image/jpeg', // Keep SVG, compress others to JPEG
    size: actualSize,
    width: dimensions.width,
    height: dimensions.height,
    createdAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString(),
    usageCount: 0,
    referencingNotes: [],
  };

  const updatedStorage: ImageStorageState = {
    ...storage,
    images: [...storage.images, image],
    totalSize: storage.totalSize + actualSize,
  };

  return { image, updatedStorage };
}

/**
 * Remove image from storage
 */
export function removeImageFromStorage(
  imageId: string,
  storage: ImageStorageState,
  force: boolean = false
): { updatedStorage: ImageStorageState; removedImage?: StoredImage } {
  const image = storage.images.find(img => img.id === imageId);
  
  if (!image) {
    throw new Error('Bild nicht gefunden');
  }

  if (!force && image.usageCount > 0) {
    throw new Error(`Bild wird noch in ${image.usageCount} Notiz(en) verwendet!`);
  }

  const updatedImages = storage.images.filter(img => img.id !== imageId);
  const updatedStorage: ImageStorageState = {
    ...storage,
    images: updatedImages,
    totalSize: storage.totalSize - image.size,
  };

  return { updatedStorage, removedImage: image };
}

/**
 * Update image usage
 */
export function updateImageUsage(
  imageId: string,
  noteId: string,
  storage: ImageStorageState,
  isUsed: boolean
): ImageStorageState {
  const updatedImages = storage.images.map(image => {
    if (image.id === imageId) {
      const wasUsed = image.referencingNotes.includes(noteId);
      
      if (isUsed && !wasUsed) {
        // Add usage
        return {
          ...image,
          usageCount: image.usageCount + 1,
          referencingNotes: [...image.referencingNotes, noteId],
          lastUsedAt: new Date().toISOString(),
        };
      } else if (!isUsed && wasUsed) {
        // Remove usage
        return {
          ...image,
          usageCount: Math.max(0, image.usageCount - 1),
          referencingNotes: image.referencingNotes.filter(id => id !== noteId),
        };
      }
    }
    return image;
  });

  return {
    ...storage,
    images: updatedImages,
  };
}

/**
 * Clean up unused images
 */
export function cleanupUnusedImages(storage: ImageStorageState): ImageStorageState {
  if (!storage.autoCleanup) return storage;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - storage.cleanupAfterDays);

  const usedImages = storage.images.filter(image => {
    // Keep if used or too recent to clean up
    return image.usageCount > 0 || new Date(image.createdAt) > cutoffDate;
  });

  const removedSize = storage.images
    .filter(image => !usedImages.includes(image))
    .reduce((total, image) => total + image.size, 0);

  return {
    ...storage,
    images: usedImages,
    totalSize: storage.totalSize - removedSize,
  };
}

/**
 * Get markdown reference for image
 */
export function getImageMarkdownReference(image: StoredImage, altText?: string): string {
  return `![${altText || image.originalName || 'Bild'}](storage://${image.id})`;
}

/**
 * Parse markdown content for image references
 */
export function parseImageReferences(content: string): ImageReference[] {
  const regex = /!\[([^\]]*)\]\(storage:\/\/([^)]+)\)/g;
  const references: ImageReference[] = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    references.push({
      imageId: match[2],
      noteId: '', // Will be set by caller
      markdownSrc: match[0],
      createdAt: new Date().toISOString(),
    });
  }

  return references;
}

/**
 * Resolve storage:// URLs to actual data URLs
 */
export function resolveImageUrls(content: string, storage: ImageStorageState): string {
  return content.replace(
    /!\[([^\]]*)\]\(storage:\/\/([^)]+)\)/g,
    (match, altText, imageId) => {
      const image = storage.images.find(img => img.id === imageId);
      if (image) {
        return `![${altText}](${image.data})`;
      }
      // Return error placeholder if image not found
      return `![${altText || 'Bild nicht gefunden'}](data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIHN0cm9rZT0iI2Y4Nzk3MSIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+CjxwYXRoIGQ9Im04IDh2OG04LTRoLTgiIHN0cm9rZT0iI2Y4Nzk3MSIgc3Ryb2tlLXdpZHRoPSIyIi8+Cjwvc3ZnPgo=)`;
    }
  );
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get file extension from MIME type
 */
function getFileExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
  };
  return extensions[mimeType] || 'jpg';
}

/**
 * Handle paste event for images
 */
export async function handleImagePaste(
  event: ClipboardEvent,
  storage: ImageStorageState
): Promise<{ image?: StoredImage; updatedStorage?: ImageStorageState; error?: string }> {
  const items = event.clipboardData?.items;
  if (!items) return {};

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    if (item.type.indexOf('image') !== -1) {
      const file = item.getAsFile();
      if (!file) continue;

      try {
        const result = await addImageToStorage(file, storage);
        return {
          image: result.image,
          updatedStorage: result.updatedStorage,
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Fehler beim Hinzufügen des Bildes',
        };
      }
    }
  }

  return {};
} 