// Stock Photos Service using Picsum Photos API
// Simple implementation: load top photos with pagination

export interface StockPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  photographer_id: number;
  avg_color: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  liked: boolean;
  alt: string;
}

export interface StockPhotoSearchResponse {
  page: number;
  per_page: number;
  photos: StockPhoto[];
  total_results: number;
  next_page?: string;
  prev_page?: string;
}

export interface StockPhotoCuratedResponse extends StockPhotoSearchResponse {}

interface PicsumPhoto {
  id: string;
  author: string;
  width: number;
  height: number;
  url: string;
  download_url: string;
}

class StockPhotosService {
  private baseUrl = 'https://picsum.photos/v2';
  private allPhotos: PicsumPhoto[] = [];
  private isInitialized = false;

  constructor() {
    this.initializePhotos();
  }

  // Load photos from Picsum API
  private async initializePhotos() {
    if (this.isInitialized) return;

    try {
      // Fetch photos from Picsum (limit 1000 to get a good selection)
      const response = await fetch(`${this.baseUrl}/list?page=1&limit=1000`);
      const photos: PicsumPhoto[] = await response.json();
      
      this.allPhotos = photos;
      this.isInitialized = true;
      
      console.log(`✅ Loaded ${photos.length} photos from Picsum`);
    } catch (error) {
      console.error('❌ Failed to load photos from Picsum:', error);
      this.initializeFallbackPhotos();
    }
  }

  // Fallback photos if API fails
  private initializeFallbackPhotos() {
    this.allPhotos = Array.from({ length: 200 }, (_, i) => ({
      id: i.toString(),
      author: 'Picsum Photos',
      width: 1920,
      height: 1080,
      url: `https://picsum.photos/id/${i}`,
      download_url: `https://picsum.photos/id/${i}/1920/1080`
    }));
    
    this.isInitialized = true;
    console.log('✅ Using fallback photos');
  }

  // Convert Picsum photo to our format with optimal quality settings
  private convertPicsumPhoto(picsumPhoto: PicsumPhoto, index: number): StockPhoto {
    const id = parseInt(picsumPhoto.id);
    const baseUrl = `https://picsum.photos/id/${picsumPhoto.id}`;
    
    // Get screen dimensions for optimal sizing
    const screenWidth = window.screen.width || 1920;
    const screenHeight = window.screen.height || 1080;
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    // Calculate optimal dimensions for high DPI displays
    const optimalWidth = Math.max(screenWidth * devicePixelRatio, 2560); // Minimum 2K
    const optimalHeight = Math.max(screenHeight * devicePixelRatio, 1440);
    
    return {
      id: id,
      width: optimalWidth,
      height: optimalHeight,
      url: `${baseUrl}/${optimalWidth}/${optimalHeight}`,
      photographer: picsumPhoto.author,
      photographer_url: 'https://picsum.photos',
      photographer_id: id,
      avg_color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
      src: {
        // Ultra High Quality - 4K für beste Displays
        original: `${baseUrl}/3840/2160`,
        // High Quality - 2K für die meisten Displays  
        large2x: `${baseUrl}/${optimalWidth}/${optimalHeight}`,
        // Standard High Quality
        large: `${baseUrl}/2560/1440`,
        // Medium Quality für Preview
        medium: `${baseUrl}/1920/1080`,
        // Small für Thumbnails
        small: `${baseUrl}/800/600`,
        // Portrait für mobile
        portrait: `${baseUrl}/1080/1920`,
        // Landscape Standard
        landscape: `${baseUrl}/1920/1080`,
        // Tiny für Icons
        tiny: `${baseUrl}/400/300`
      },
      liked: false,
      alt: `Photo by ${picsumPhoto.author}`
    };
  }

  // Get photos with pagination
  private async getPhotosPage(page: number = 1, perPage: number = 20): Promise<StockPhoto[]> {
    await this.initializePhotos();

    const offset = (page - 1) * perPage;
    const endIndex = offset + perPage;
    
    // If we need more photos than we have, cycle through them
    const photos: StockPhoto[] = [];
    for (let i = 0; i < perPage; i++) {
      const photoIndex = (offset + i) % this.allPhotos.length;
      const picsumPhoto = this.allPhotos[photoIndex];
      if (picsumPhoto) {
        photos.push(this.convertPicsumPhoto(picsumPhoto, offset + i));
      }
    }

    return photos;
  }

  // Search for photos (simplified - just return top photos)
  async searchPhotos(
    query: string, 
    page: number = 1, 
    perPage: number = 20
  ): Promise<StockPhotoSearchResponse> {
    // For now, ignore query and just return top photos
    const photos = await this.getPhotosPage(page, perPage);
    
    return {
      page: page,
      per_page: perPage,
      photos: photos,
      total_results: this.allPhotos.length,
      next_page: photos.length === perPage ? `page=${page + 1}` : undefined
    };
  }

  // Get curated photos (top photos)
  async getCuratedPhotos(
    page: number = 1, 
    perPage: number = 20
  ): Promise<StockPhotoCuratedResponse> {
    const photos = await this.getPhotosPage(page, perPage);
    
    return {
      page: page,
      per_page: perPage,
      photos: photos,
      total_results: this.allPhotos.length,
      next_page: photos.length === perPage ? `page=${page + 1}` : undefined
    };
  }

  // No categories anymore - return empty array
  getPopularCategories(): string[] {
    return [];
  }

  // Get the best size URL for background use - defaults to highest quality
  getBackgroundUrl(photo: StockPhoto, size: 'small' | 'medium' | 'large' | 'original' = 'original'): string {
    switch (size) {
      case 'small':
        return photo.src.small;
      case 'medium':
        return photo.src.medium;
      case 'large':
        return photo.src.large;
      case 'original':
        return photo.src.original; // 4K Ultra HD quality
      default:
        return photo.src.original; // Default to highest quality
    }
  }

  // Get photo information for attribution
  getPhotoInfo(photo: StockPhoto): string {
    return `Photo by ${photo.photographer} on Picsum Photos`;
  }

  // Get optimal background URL based on screen size and pixel density
  getOptimalBackgroundUrl(photo: StockPhoto): string {
    const screenWidth = window.screen.width || 1920;
    const screenHeight = window.screen.height || 1080;
    const devicePixelRatio = window.devicePixelRatio || 1;
    const totalPixels = screenWidth * screenHeight * devicePixelRatio;

    // Choose quality based on screen size and pixel density
    if (totalPixels >= 8294400) { // 4K+ displays (3840x2160)
      return photo.src.original; // 4K Ultra HD
    } else if (totalPixels >= 3686400) { // 2K+ displays (2560x1440)
      return photo.src.large2x; // High Quality 2K
    } else if (totalPixels >= 2073600) { // 1080p+ displays (1920x1080)
      return photo.src.large; // Standard High Quality
    } else {
      return photo.src.medium; // Medium Quality for smaller screens
    }
  }
}

export const stockPhotosService = new StockPhotosService(); 