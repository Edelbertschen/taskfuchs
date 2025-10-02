import React, { useState, useRef, useEffect } from 'react';
import { Plus, CheckSquare, FileText } from 'lucide-react';
import { MaterialIcon } from './MaterialIcon';
import { useAppTranslation } from '../../utils/i18nHelpers';

interface FloatingAddButtonProps {
  onCreateTask: () => void;
  colors: {
    primary: string;
    dark: string;
  };
}

export function FloatingAddButton({ onCreateTask, colors }: FloatingAddButtonProps) {
  const { floatingAddButton } = useAppTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const handleTaskClick = () => { onCreateTask(); };

  return (
    <div ref={containerRef} className="fixed bottom-4 right-4 z-30">
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