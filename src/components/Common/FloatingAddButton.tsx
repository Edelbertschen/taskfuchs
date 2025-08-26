import React, { useState, useRef, useEffect } from 'react';
import { Plus, CheckSquare, FileText } from 'lucide-react';
import { MaterialIcon } from './MaterialIcon';
import { useAppTranslation } from '../../utils/i18nHelpers';

interface FloatingAddButtonProps {
  onCreateTask: () => void;
  onCreateNote: () => void;
  colors: {
    primary: string;
    dark: string;
  };
}

export function FloatingAddButton({ onCreateTask, onCreateNote, colors }: FloatingAddButtonProps) {
  const { floatingAddButton } = useAppTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMainButtonClick = () => {
    setIsExpanded(!isExpanded);
  };

  const handleTaskClick = () => {
    onCreateTask();
    setIsExpanded(false);
  };

  const handleNoteClick = () => {
    onCreateNote();
    setIsExpanded(false);
  };

  return (
    <div ref={containerRef} className="fixed bottom-4 right-4 z-30">
      <div className="relative">
        {/* Option Buttons - Appear when expanded */}
        <div className={`absolute bottom-16 right-0 flex flex-col space-y-3 transition-all duration-300 ${
          isExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}>
          {/* Task Button */}
          <button
            onClick={handleTaskClick}
            className="floating-add-button w-12 h-12 text-white shadow-md hover:shadow-lg btn-hover smooth-transform transition-all duration-200 hover:scale-110 active:scale-95 rounded-full flex items-center justify-center"
            style={{ backgroundColor: colors.primary }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.dark}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.primary}
            title="Neue Aufgabe"
          >
            <CheckSquare className="w-5 h-5" />
          </button>
          
          {/* Note Button */}
          <button
            onClick={handleNoteClick}
            className="floating-add-button w-12 h-12 text-white shadow-md hover:shadow-lg btn-hover smooth-transform transition-all duration-200 hover:scale-110 active:scale-95 rounded-full flex items-center justify-center"
            style={{ backgroundColor: colors.primary }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.dark}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.primary}
            title="Neue Notiz"
          >
            <FileText className="w-5 h-5" />
          </button>
        </div>

        {/* Main Plus Button */}
        <button
          onClick={handleMainButtonClick}
          className={`floating-add-button w-14 h-14 text-white shadow-md hover:shadow-lg btn-hover smooth-transform transition-all duration-300 hover:scale-110 active:scale-95 rounded-full flex items-center justify-center ${
            isExpanded ? 'rotate-45' : 'rotate-0'
          }`}
          style={{ backgroundColor: colors.primary }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.dark}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.primary}
          title={isExpanded ? floatingAddButton.close() : floatingAddButton.add()}
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
} 