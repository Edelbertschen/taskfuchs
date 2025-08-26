import React, { useState, useRef, useEffect, memo } from 'react';
import { useIntersectionObserver } from '../../utils/performance';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  blurDataURL?: string;
  width?: number;
  height?: number;
  onLoad?: () => void;
  onError?: () => void;
}

const LazyImage = memo(function LazyImage({
  src,
  alt,
  className = '',
  placeholder,
  blurDataURL,
  width,
  height,
  onLoad,
  onError
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [imageSrc, setImageSrc] = useState(blurDataURL || placeholder || '');
  const imgRef = useRef<HTMLImageElement>(null);

  // Use intersection observer for lazy loading
  const isInView = useIntersectionObserver(imgRef, {
    threshold: 0.1,
    triggerOnce: true
  });

  // Load image when in view
  useEffect(() => {
    if (isInView && src && !isLoaded && !isError) {
      const img = new Image();
      
      img.onload = () => {
        setImageSrc(src);
        setIsLoaded(true);
        onLoad?.();
      };
      
      img.onerror = () => {
        setIsError(true);
        onError?.();
      };
      
      img.src = src;
    }
  }, [isInView, src, isLoaded, isError, onLoad, onError]);

  const containerStyle: React.CSSProperties = {
    width: width || 'auto',
    height: height || 'auto',
    backgroundColor: '#f3f4f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative'
  };

  const imageStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'opacity 0.3s ease-in-out',
    opacity: isLoaded ? 1 : 0.7
  };

  if (isError) {
    return (
      <div 
        ref={imgRef}
        className={`bg-gray-200 dark:bg-gray-700 flex items-center justify-center ${className}`}
        style={containerStyle}
      >
        <div className="text-center text-gray-500 dark:text-gray-400">
          <div className="w-8 h-8 mx-auto mb-2">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-xs">Fehler beim Laden</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={containerStyle}
    >
      {/* Loading placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 text-gray-400">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      )}
      
      {/* Actual image */}
      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          style={imageStyle}
          loading="lazy"
          decoding="async"
        />
      )}
      
      {/* Blur overlay during loading */}
      {blurDataURL && !isLoaded && (
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${blurDataURL})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(10px)',
            transform: 'scale(1.1)' // Prevent blur edges
          }}
        />
      )}
    </div>
  );
});

export { LazyImage }; 