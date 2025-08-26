import React, { useState, useRef, useEffect } from 'react';
import { LucideIcon, Move, RotateCcw } from 'lucide-react';

interface WidgetLayout {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DraggableWidgetProps {
  id: string;
  title: string;
  icon: LucideIcon;
  layout: WidgetLayout;
  onLayoutChange: (id: string, newLayout: Partial<WidgetLayout>) => void;
  children: React.ReactNode;
}

export function DraggableWidget({
  id,
  title,
  icon: Icon,
  layout,
  onLayoutChange,
  children
}: DraggableWidgetProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const widgetRef = useRef<HTMLDivElement>(null);

  // Handle mouse down for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('drag-handle')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - layout.x,
        y: e.clientY - layout.y
      });
      e.preventDefault();
    }
  };

  // Handle resize mouse down
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: layout.width,
      height: layout.height
    });
    e.preventDefault();
    e.stopPropagation();
  };

  // Handle mouse move
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = Math.max(0, e.clientX - dragStart.x);
        const newY = Math.max(0, e.clientY - dragStart.y);
        onLayoutChange(id, { x: newX, y: newY });
      } else if (isResizing) {
        const newWidth = Math.max(250, resizeStart.width + (e.clientX - resizeStart.x));
        const newHeight = Math.max(200, resizeStart.height + (e.clientY - resizeStart.y));
        onLayoutChange(id, { width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = isDragging ? 'grabbing' : 'nw-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, isResizing, dragStart, resizeStart, id, onLayoutChange]);

  return (
    <div
      ref={widgetRef}
              className={`absolute glass-effect rounded-2xl transition-all duration-300 ${
          isDragging ? 'scale-105' : 'hover:scale-[1.02]'
      }`}
      style={{
        left: layout.x,
        top: layout.y,
        width: layout.width,
        height: layout.height,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Widget Header */}
      <div className="drag-handle flex items-center justify-between p-4 bg-white/5 dark:bg-gray-800/5 backdrop-blur-sm cursor-grab active:cursor-grabbing rounded-t-2xl" data-drag-handle>
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/80 to-purple-600/80 backdrop-blur-sm flex items-center justify-center">
            <Icon className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-medium text-white" style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)' }}>{title}</h3>
        </div>
        <div className="flex items-center space-x-2">
          <Move className="w-4 h-4 text-white/70" />
        </div>
      </div>

      {/* Widget Content */}
      <div className="p-4 h-[calc(100%-80px)] overflow-auto backdrop-blur-sm bg-transparent rounded-b-2xl">
        {children}
      </div>

      {/* Resize Handle */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nw-resize opacity-0 hover:opacity-100 transition-all duration-200"
        onMouseDown={handleResizeMouseDown}
      >
        <div className="absolute bottom-1 right-1 w-3 h-3 border-r-2 border-b-2 border-white/50 dark:border-gray-400/50 backdrop-blur-sm"></div>
      </div>
    </div>
  );
} 