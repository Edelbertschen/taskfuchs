import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Download } from 'lucide-react';
import { stockPhotosService, StockPhoto } from '../../utils/stockPhotosService';
import { useApp } from '../../context/AppContext';

interface StockPhotosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPhoto: (photo: StockPhoto) => void;
}

export const StockPhotosModal: React.FC<StockPhotosModalProps> = ({
  isOpen,
  onClose,
  onSelectPhoto
}) => {
  const { state } = useApp();
  const { preferences } = state;
  const isMinimalDesign = state.preferences.minimalDesign;
  
  const [photos, setPhotos] = useState<StockPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const modalRef = useRef<HTMLDivElement>(null);

  // Load initial photos
  useEffect(() => {
    if (isOpen) {
      loadPhotos(1, true);
    }
  }, [isOpen]);

  const loadPhotos = async (page: number, reset: boolean = false) => {
    if (loading) return;
    
    setLoading(true);
    setError(null);

    try {
      const response = await stockPhotosService.getCuratedPhotos(page, 20);
      
      if (response.photos && response.photos.length > 0) {
        if (reset) {
          setPhotos(response.photos);
        } else {
          setPhotos(prev => [...prev, ...response.photos]);
        }
        setCurrentPage(page);
        setHasMore(!!response.next_page);
      } else {
        setError('Keine Bilder gefunden.');
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error loading photos:', err);
      setError('Fehler beim Laden der Bilder.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadPhotos(currentPage + 1, false);
    }
  };

  const handleImageSelect = (photo: StockPhoto) => {
    onSelectPhoto(photo);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div 
        ref={modalRef}
        className={`relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl ${
          isMinimalDesign 
            ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700' 
            : 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-white/20'
        }`}
        style={{
          boxShadow: isMinimalDesign 
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.25)' 
            : '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
        }}
      >
        {/* Header */}
        <div className={`sticky top-0 z-10 p-6 border-b ${
          isMinimalDesign 
            ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800' 
            : 'border-white/10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-2xl font-bold ${
                isMinimalDesign ? 'text-gray-900 dark:text-white' : 'text-gray-900 dark:text-white'
              }`}>
                Stock-Hintergrundbilder
              </h2>
              <p className={`text-sm mt-1 ${
                isMinimalDesign ? 'text-gray-600 dark:text-gray-400' : 'text-gray-600 dark:text-gray-400'
              }`}>
                Hochwertige Fotos von Picsum Photos
              </p>
            </div>
            <button
              onClick={onClose}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 ${
                isMinimalDesign
                  ? 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                  : 'bg-white/10 hover:bg-white/20 backdrop-blur-sm text-gray-700 dark:text-gray-300'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {error && (
            <div className={`p-4 rounded-xl mb-6 text-center ${
              isMinimalDesign 
                ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' 
                : 'bg-red-500/10 border border-red-500/20 backdrop-blur-xl'
            }`}>
              <p className={`${
                isMinimalDesign ? 'text-red-700 dark:text-red-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {error}
              </p>
            </div>
          )}

          {photos.length > 0 ? (
            <>
              {/* Photo Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className={`group relative aspect-square rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:scale-105 ${
                      isMinimalDesign
                        ? 'bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-lg'
                        : 'bg-white/5 border border-white/10 backdrop-blur-xl shadow-lg hover:shadow-2xl'
                    }`}
                    onClick={() => handleImageSelect(photo)}
                  >
                    <img
                      src={photo.src.small}
                      alt={photo.alt}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="absolute bottom-2 left-2 right-2">
                        <p className="text-white text-xs font-medium truncate">
                          {photo.photographer}
                        </p>
                      </div>
                      <div className="absolute top-2 right-2">
                        <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <Download className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div className="text-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={loading}
                    className={`px-8 py-3 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                      isMinimalDesign
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-lg hover:shadow-xl'
                        : 'text-white shadow-lg hover:shadow-xl hover:scale-105'
                    }`}
                    style={{
                      backgroundColor: isMinimalDesign ? undefined : preferences.accentColor,
                      ...(isMinimalDesign ? {} : {
                        background: `linear-gradient(135deg, ${preferences.accentColor}, ${preferences.accentColor}dd)`
                      })
                    }}
                  >
                    {loading ? 'Lädt...' : 'Weitere Bilder laden'}
                  </button>
                </div>
              )}

              {!hasMore && photos.length > 0 && (
                <p className={`text-center text-sm ${
                  isMinimalDesign ? 'text-gray-500 dark:text-gray-400' : 'text-gray-600 dark:text-gray-400'
                }`}>
                  Alle verfügbaren Bilder wurden geladen.
                </p>
              )}
            </>
          ) : loading ? (
            <div className="text-center py-12">
              <div className={`inline-block w-8 h-8 border-4 border-current border-t-transparent rounded-full animate-spin ${
                isMinimalDesign ? 'text-gray-600 dark:text-gray-400' : 'text-gray-600 dark:text-gray-400'
              }`}></div>
              <p className={`mt-4 ${
                isMinimalDesign ? 'text-gray-600 dark:text-gray-400' : 'text-gray-600 dark:text-gray-400'
              }`}>
                Lade Bilder...
              </p>
            </div>
          ) : (
            <div className={`text-center py-12 rounded-xl ${
              isMinimalDesign 
                ? 'bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700' 
                : 'bg-white/5 border border-white/10 backdrop-blur-xl'
            }`}>
              <p className={`text-lg font-medium mb-2 ${
                isMinimalDesign ? 'text-gray-900 dark:text-white' : 'text-gray-900 dark:text-white'
              }`}>
                Keine Bilder verfügbar
              </p>
              <p className={`text-sm ${
                isMinimalDesign ? 'text-gray-600 dark:text-gray-400' : 'text-gray-600 dark:text-gray-400'
              }`}>
                Bitte versuchen Sie es später erneut.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`sticky bottom-0 p-4 border-t text-center ${
          isMinimalDesign 
            ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800' 
            : 'border-white/10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl'
        }`}>
          <p className={`text-xs ${
            isMinimalDesign ? 'text-gray-500 dark:text-gray-400' : 'text-gray-600 dark:text-gray-400'
          }`}>
            Powered by{' '}
            <a 
              href="https://picsum.photos" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline hover:no-underline"
            >
              Picsum Photos
            </a>
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}; 