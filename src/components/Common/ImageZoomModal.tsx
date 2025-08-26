import React, { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Download, Maximize2, Minimize2 } from 'lucide-react';

interface ImageZoomModalProps {
  src: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageZoomModal({ src, alt, isOpen, onClose }: ImageZoomModalProps) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
      setRotation(0);
      setIsFullscreen(false);
    }
  }, [isOpen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case '+':
        case '=':
          e.preventDefault();
          setZoom(prev => Math.min(prev + 0.25, 5));
          break;
        case '-':
          e.preventDefault();
          setZoom(prev => Math.max(prev - 0.25, 0.1));
          break;
        case '0':
          e.preventDefault();
          setZoom(1);
          setPosition({ x: 0, y: 0 });
          break;
        case 'r':
          e.preventDefault();
          setRotation(prev => prev + 90);
          break;
        case 'f':
          e.preventDefault();
          setIsFullscreen(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle mouse events for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.max(0.1, Math.min(5, prev + delta)));
  };

  // Download image
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = alt || 'image';
    link.click();
  };

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 ${
        isFullscreen ? 'p-0' : 'p-4'
      }`}
      onClick={onClose}
    >
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex items-center space-x-2">
        <div className="flex items-center space-x-1 bg-black/50 rounded-lg p-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setZoom(prev => Math.max(prev - 0.25, 0.1));
            }}
            className="p-2 text-white hover:text-orange-400 transition-colors"
            title="Verkleinern (- Taste)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          
          <span className="text-white text-sm font-medium px-2 min-w-[60px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              setZoom(prev => Math.min(prev + 0.25, 5));
            }}
            className="p-2 text-white hover:text-orange-400 transition-colors"
            title="Vergrößern (+ Taste)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex items-center space-x-1 bg-black/50 rounded-lg p-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setRotation(prev => prev + 90);
            }}
            className="p-2 text-white hover:text-orange-400 transition-colors"
            title="Drehen (R Taste)"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsFullscreen(prev => !prev);
            }}
            className="p-2 text-white hover:text-orange-400 transition-colors"
            title="Vollbild (F Taste)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDownload();
            }}
            className="p-2 text-white hover:text-orange-400 transition-colors"
            title="Herunterladen"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
        
        <button
          onClick={onClose}
          className="p-2 bg-black/50 text-white hover:text-orange-400 transition-colors rounded-lg"
          title="Schließen (Escape)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Image Container */}
      <div 
        className="relative w-full h-full flex items-center justify-center overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          className="max-w-none transition-transform duration-200 select-none"
          style={{
            transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px) rotate(${rotation}deg)`,
            transformOrigin: 'center center'
          }}
          draggable={false}
        />
      </div>

      {/* Info Bar */}
      <div className="absolute bottom-4 left-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg p-3 text-white">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {alt && (
              <div className="text-sm font-medium mb-1">{alt}</div>
            )}
            <div className="text-xs text-gray-300">
              Shortcuts: + / - (Zoom), 0 (Reset), R (Drehen), F (Vollbild), Escape (Schließen)
            </div>
          </div>
          <div className="text-xs text-gray-300">
            {Math.round(zoom * 100)}% • {rotation}°
          </div>
        </div>
      </div>
    </div>
  );
} 