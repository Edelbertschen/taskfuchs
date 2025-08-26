import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  MoreHorizontal, 
  Edit2, 
  Trash2, 
  Archive, 
  Focus, 
  Sparkles, 
  Download,
  FileText,
  Columns
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from 'react-i18next';
import { Column } from '../../types';

interface ColumnContextMenuProps {
  column: Column;
  isOpen: boolean;
  onClose: () => void;
  onEditColumn?: () => void;
  onDeleteColumn?: () => void;
  onArchiveCompleted?: () => void;
  onFocusColumn?: () => void;
  onSmartTaskAdd?: () => void;
  onExportTasks?: () => void;
  onColumnManager?: () => void;
  mousePosition: { x: number; y: number };
  // Context flags
  isProjectColumn?: boolean;
  isPlanner?: boolean;
  isPinColumn?: boolean;
}

export function ColumnContextMenu({ 
  column,
  isOpen,
  onClose,
  onEditColumn,
  onDeleteColumn,
  onArchiveCompleted,
  onFocusColumn,
  onSmartTaskAdd,
  onExportTasks,
  onColumnManager,
  mousePosition,
  isProjectColumn = false,
  isPlanner = false,
  isPinColumn = false
}: ColumnContextMenuProps) {
  const { state, dispatch } = useApp();
  const { t, i18n } = useTranslation();
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
      const menu = menuRef.current;
      const rect = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let left = mousePosition.x;
      let top = mousePosition.y;
      
      // Adjust if menu would go off-screen
      if (left + rect.width > viewportWidth) {
        left = viewportWidth - rect.width - 10;
      }
      
      if (top + rect.height > viewportHeight) {
        top = viewportHeight - rect.height - 10;
      }
      
      // Ensure minimum distance from edges
      left = Math.max(10, left);
      top = Math.max(10, top);
      
      setMenuPosition({ left, top });
    }
  }, [isOpen, mousePosition]);

  if (!isOpen) return null;

  const MenuContent = () => (
    <div
      ref={menuRef}
      className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-2 min-w-[200px] max-w-[280px]"
      style={{
        left: menuPosition.left,
        top: menuPosition.top,
        zIndex: 999999
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Edit Column - In Project columns and Pin columns */}
      {(isProjectColumn || isPinColumn) && onEditColumn && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditColumn();
              onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            <span>{i18n.language === 'en' ? 'Edit column name' : 'Spaltennamen editieren'}</span>
          </button>
          
          <div className="border-t border-gray-200 dark:border-gray-600 my-1" />
        </>
      )}

      {/* Column Manager - For Pin columns and Project columns */}
      {(isPinColumn || isProjectColumn) && onColumnManager && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onColumnManager();
              onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Columns className="w-4 h-4" />
            <span>{i18n.language === 'en' ? 'Organize columns' : 'Spalten organisieren'}</span>
          </button>
          
          <div className="border-t border-gray-200 dark:border-gray-600 my-1" />
        </>
      )}

      {/* Export Tasks - Only in Planner */}
      {isPlanner && onExportTasks && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExportTasks();
              onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>{t('planner.export_tasks')}</span>
          </button>
          
          <div className="border-t border-gray-200 dark:border-gray-600 my-1" />
        </>
      )}

      {/* Archive Completed Tasks */}
      {onArchiveCompleted && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onArchiveCompleted();
            onClose();
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <Archive className="w-4 h-4" />
          <span>{t('planner.archive_completed')}</span>
        </button>
      )}

      {/* Focus Column - removed per request */}

      {/* Smart Task Add */}
      {onSmartTaskAdd && (
        <>
          <div className="border-t border-gray-200 dark:border-gray-600 my-1" />
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSmartTaskAdd();
              onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>{i18n.language === 'en' ? 'Create smart task' : 'Smart Aufgabe erstellen'}</span>
          </button>
        </>
      )}

      {/* Delete Column - As last item for Project and Pin columns */}
      {(isProjectColumn || isPinColumn) && onDeleteColumn && (
        <>
          <div className="border-t border-gray-200 dark:border-gray-600 my-1" />
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteColumn();
              onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>{i18n.language === 'en' ? 'Delete column' : 'Spalte löschen'}</span>
          </button>
        </>
      )}
    </div>
  );

  return createPortal(<MenuContent />, document.body);
} 