import React, { useState, useRef, useEffect } from 'react';
import { Plus, CheckSquare, FileText, Wand2 } from 'lucide-react';
import { MaterialIcon } from './MaterialIcon';
import { useAppTranslation } from '../../utils/i18nHelpers';

interface FloatingAddButtonProps {
  onCreateTask: () => void;
  onAiBulkTask?: () => void;
  colors: {
    primary: string;
    dark: string;
  };
}

export function FloatingAddButton({ onCreateTask, onAiBulkTask, colors }: FloatingAddButtonProps) {
  const { floatingAddButton } = useAppTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const handleTaskClick = () => { onCreateTask(); };

  return (
    <div ref={containerRef} className="fixed bottom-4 right-4 z-30 flex flex-col gap-3">
      {/* AI Bulk Task Button */}
      {onAiBulkTask && (
        <div className="relative">
          <button
            onClick={onAiBulkTask}
            className="w-12 h-12 text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 rounded-full flex items-center justify-center bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            title="KI-Aufgaben erstellen"
          >
            <Wand2 className="w-5 h-5" />
          </button>
        </div>
      )}
      {/* Main Add Task Button */}
      <div className="relative">
        <button
          onClick={handleTaskClick}
          className="floating-add-button w-14 h-14 text-white shadow-md hover:shadow-lg btn-hover smooth-transform transition-all duration-300 hover:scale-110 active:scale-95 rounded-full flex items-center justify-center"
          style={{ backgroundColor: colors.primary }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.dark}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.primary}
          title={floatingAddButton.addTask?.() || 'Neue Aufgabe'}
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
} 