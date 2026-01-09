import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';
import { Edit3, Trash2 } from 'lucide-react';

interface ProjectContextMenuProps {
  project: any;
  isOpen: boolean;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
  mousePosition: { x: number; y: number };
}

export function ProjectContextMenu({ 
  project,
  isOpen,
  onClose,
  onRename,
  onDelete,
  mousePosition
}: ProjectContextMenuProps) {
  const { state } = useApp();
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  // Close menu on ESC key or outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isOpen) return;
      
      const target = event.target as Element;
      
      // Don't close if clicking within menu
      if (menuRef.current && menuRef.current.contains(target)) {
        return;
      }
      
      // Don't close if clicking on any element with high z-index (other menus/modals)
      const clickedElement = target.closest('[style*="z-index"]');
      if (clickedElement) {
        const zIndex = parseInt(window.getComputedStyle(clickedElement).zIndex || '0');
        if (zIndex >= 999999) {
          return;
        }
      }
      
      onClose();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Position menu
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const { x, y } = mousePosition;
      const menuRect = menuRef.current.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      
      let top = y;
      let left = x;

      // Adjust position to keep menu on screen
      if (left + menuRect.width > windowWidth) {
        left = windowWidth - menuRect.width - 10;
      }
      if (top + menuRect.height > windowHeight) {
        top = windowHeight - menuRect.height - 10;
      }
      if (left < 0) left = 10;
      if (top < 0) top = 10;

      setMenuPosition({ top, left });
    }
  }, [isOpen, mousePosition]);

  if (!isOpen) return null;

  const menuItems = [
    {
      label: t('projects.rename_project'),
      icon: <Edit3 className="w-4 h-4" />,
      action: () => {
        onRename();
        onClose();
      },
      danger: false
    },
    {
      label: t('projects.delete_project'),
      icon: <Trash2 className="w-4 h-4" />,
      action: () => {
        onDelete();
        onClose();
      },
      danger: true
    }
  ];

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[999999] py-2 min-w-[200px] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 animate-in fade-in-0 zoom-in-95 duration-150"
      style={{
        top: menuPosition.top,
        left: menuPosition.left,
      }}
    >
      {menuItems.map((menuItem, index) => (
        <button
          key={index}
          onClick={menuItem.action}
          className={`w-full flex items-center space-x-3 px-4 py-2 text-sm transition-colors ${
            menuItem.danger 
              ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <span className={
            menuItem.danger 
              ? 'text-red-500 dark:text-red-400' 
              : 'text-gray-500 dark:text-gray-400'
          }>
            {menuItem.icon}
          </span>
          <span>{menuItem.label}</span>
        </button>
      ))}
    </div>,
    document.body
  );
} 