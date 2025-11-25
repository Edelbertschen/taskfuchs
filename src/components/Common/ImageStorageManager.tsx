import React, { useState } from 'react';
import { 
  Image as ImageIcon, 
  Trash2, 
  Search, 
  Download, 
  AlertTriangle, 
  Calendar, 
  FileImage, 
  HardDrive,
  Settings,
  X,
  Eye,
  Maximize2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatFileSize, removeImageFromStorage, saveImageStorage } from '../../utils/imageStorage';
import type { StoredImage } from '../../types';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface ImageStorageManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImageStorageManager({ isOpen, onClose }: ImageStorageManagerProps) {
  const { state, dispatch } = useApp();
  const { imageStorage } = state;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImage, setSelectedImage] = useState<StoredImage | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState<StoredImage | null>(null);

  // Filter images based on search query
  const filteredImages = imageStorage.images.filter(image => {
    const query = searchQuery.toLowerCase();
    return (
      image.originalName?.toLowerCase().includes(query) ||
      image.filename.toLowerCase().includes(query) ||
      image.referencingNotes.some(noteId => {
        const note = state.notes.notes.find(n => n.id === noteId);
        return note?.title.toLowerCase().includes(query);
      })
    );
  });

  // Sort images by last used date (most recent first)
  const sortedImages = [...filteredImages].sort((a, b) => 
    new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime()
  );

  const getAccentColorStyles = () => {
    const accentColor = state.preferences.accentColor;
    return {
      text: { color: accentColor },
      bg: { backgroundColor: accentColor },
      bgHover: { backgroundColor: accentColor + 'E6' },
      border: { borderColor: accentColor },
      bgLight: { backgroundColor: accentColor + '1A' },
    };
  };

  const handleDeleteImage = (imageId: string, force: boolean = false) => {
    try {
      const result = removeImageFromStorage(imageId, imageStorage, force);
      dispatch({ type: 'SET_IMAGE_STORAGE', payload: result.updatedStorage });
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting image:', error);
      if (!force && error instanceof Error && error.message.includes('verwendet')) {
        // Show confirmation for forced deletion
        setShowDeleteConfirm(imageId);
      }
    }
  };

  const handleClearStorage = () => {
    const emptyStorage = {
      ...imageStorage,
      images: [],
      totalSize: 0,
    };
    dispatch({ type: 'SET_IMAGE_STORAGE', payload: emptyStorage });
    saveImageStorage(emptyStorage);
  };

  const handleCleanupUnused = () => {
    dispatch({ type: 'CLEANUP_UNUSED_IMAGES' });
  };

  const downloadImage = (image: StoredImage) => {
    const link = document.createElement('a');
    link.href = image.data;
    link.download = image.originalName || image.filename;
    link.click();
  };

  const getUsageInfo = (image: StoredImage) => {
    const notes = image.referencingNotes
      .map(noteId => state.notes.notes.find(n => n.id === noteId))
      .filter(Boolean);
    
    return {
      count: image.usageCount,
      notes: notes
    };
  };

  const progressPercentage = Math.min((imageStorage.totalSize / imageStorage.maxSize) * 100, 100);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={getAccentColorStyles().bgLight}
            >
              <ImageIcon className="w-5 h-5" style={getAccentColorStyles().text} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Bildspeicher verwalten
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {imageStorage.images.length} Bilder • {formatFileSize(imageStorage.totalSize)} verwendet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Storage Info */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <HardDrive className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Speicherplatz
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleCleanupUnused}
                className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                style={getAccentColorStyles().border}
              >
                Aufräumen
              </button>
              <button
                onClick={handleClearStorage}
                className="px-3 py-1 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Alles löschen
              </button>
            </div>
          </div>
          
          <div className="relative w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className="absolute top-0 left-0 h-3 rounded-full transition-all duration-300"
              style={{ 
                width: `${progressPercentage}%`,
                backgroundColor: progressPercentage > 90 ? '#ef4444' : progressPercentage > 70 ? '#f59e0b' : getAccentColorStyles().bg.backgroundColor
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>{formatFileSize(imageStorage.totalSize)}</span>
            <span>{formatFileSize(imageStorage.maxSize)} Maximum</span>
          </div>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Bilder durchsuchen..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Images Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {sortedImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={getAccentColorStyles().bgLight}
              >
                <ImageIcon className="w-8 h-8" style={getAccentColorStyles().text} />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {searchQuery ? 'Keine Bilder gefunden' : 'Noch keine Bilder'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md">
                {searchQuery 
                  ? 'Versuche andere Suchbegriffe oder lösche Filter.'
                  : 'Füge Screenshots per Copy & Paste in deine Notizen ein.'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {sortedImages.map(image => {
                const usage = getUsageInfo(image);
                
                return (
                  <div
                    key={image.id}
                    className="group relative bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200"
                  >
                    {/* Image */}
                    <div className="aspect-square relative overflow-hidden">
                      <img
                        src={image.data}
                        alt={image.originalName || 'Bild'}
                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-200"
                        onClick={() => setShowImageModal(image)}
                      />
                      
                      {/* Overlay with actions */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setShowImageModal(image)}
                            className="p-2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-lg transition-all"
                            title="Vollbild anzeigen"
                          >
                            <Eye className="w-4 h-4 text-gray-900" />
                          </button>
                          <button
                            onClick={() => downloadImage(image)}
                            className="p-2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-lg transition-all"
                            title="Herunterladen"
                          >
                            <Download className="w-4 h-4 text-gray-900" />
                          </button>
                          <button
                            onClick={() => handleDeleteImage(image.id)}
                            className="p-2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-lg transition-all"
                            title="Löschen"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate" title={image.originalName}>
                        {image.originalName || image.filename}
                      </h4>
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>{formatFileSize(image.size)}</span>
                        <span>
                          {usage.count > 0 ? `${usage.count}x verwendet` : 'Nicht verwendet'}
                        </span>
                      </div>
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <Calendar className="w-3 h-3 mr-1" />
                        <span>
                          {format(new Date(image.createdAt), 'dd.MM.yy', { locale: de })}
                        </span>
                      </div>
                      
                      {usage.count > 0 && (
                        <div className="mt-2">
                          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
                            <FileImage className="w-3 h-3 mr-1" />
                            <span>Verwendet in:</span>
                          </div>
                          {usage.notes.slice(0, 2).map(note => (
                            <div key={note?.id} className="text-xs text-gray-600 dark:text-gray-300 truncate">
                              {note?.title || 'Unbenannte Notiz'}
                            </div>
                          ))}
                          {usage.notes.length > 2 && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              +{usage.notes.length - 2} weitere
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60 p-4">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setShowImageModal(null)}
              className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-opacity-75 text-white rounded-lg transition-all z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={showImageModal.data}
              alt={showImageModal.originalName || 'Bild'}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded-lg">
              <h3 className="font-medium">{showImageModal.originalName || showImageModal.filename}</h3>
              <div className="flex items-center justify-between text-sm text-gray-300 mt-2">
                <span>{formatFileSize(showImageModal.size)}</span>
                <span>{showImageModal.width} × {showImageModal.height}px</span>
                <span>{format(new Date(showImageModal.createdAt), 'dd.MM.yyyy', { locale: de })}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Bild wird noch verwendet
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Dieses Bild wird noch in Notizen verwendet.
                </p>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={() => {
                  if (showDeleteConfirm) {
                    handleDeleteImage(showDeleteConfirm, true);
                  }
                }}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Trotzdem löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 