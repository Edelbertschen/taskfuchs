import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../../context/AppContext';
import { useCelebration } from '../../context/CelebrationContext';
import { format, isToday, isYesterday, isTomorrow, isPast, subDays } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { MaterialIcon } from '../Common/MaterialIcon';
import { useTranslation } from 'react-i18next';
import { useAppTranslation } from '../../utils/i18nHelpers';
import { useDebounce } from '../../utils/performance';
import { getFuchsImagePath, getImagePath } from '../../utils/imageUtils';

// DnD Kit imports
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';

import { 
  Star, AlertCircle, CheckCircle2, Circle, Plus, Check, X, ArrowRight,
  Clock, FileText, Edit3, Bold, Italic, Code, List, ListOrdered, 
  Link as LinkIcon, Minus, HelpCircle, Heading1, Heading2, Heading3, ExternalLink,
  Zap, CheckSquare, Bell, Calendar, Edit, Settings, Trash2, MoreVertical,
  Sun, Moon, ChevronDown, ChevronUp
} from 'lucide-react';
import { TaskModal } from '../Tasks/TaskModal';
import { SmartTaskModal } from '../Tasks/SmartTaskModal';
import { TaskCard } from '../Tasks/TaskCard';
import { EndOfDayModal } from '../Common/EndOfDayModal';
import type { Task } from '../../types';
import { notificationService } from '../../utils/notificationService';
import { ChecklistReminderModal } from '../Common/ChecklistReminderModal';
import { PinnedTasksWidget } from './PinnedTasksWidget';
import { SyncStatusWidget } from './SyncStatusWidget';
import { MobilePullToRefresh } from '../Common/MobilePullToRefresh';
import { SwipeableTaskCard } from '../Inbox/SwipeableTaskCard';
import { MobileSnackbar } from '../Common/MobileSnackbar';

interface TodayViewProps {
  onNavigate?: (view: string) => void;
}

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  reminderDate?: string; // ISO date string
  reminderTime?: string; // Time in HH:mm format
}

// Simple ID generator (replacing uuid)
const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

// DraggableTask Component
function DraggableTask({ task, className, children }: { task: Task; className?: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`${className} ${isDragging ? 'opacity-50' : ''}`}
    >
      {children}
    </div>
  );
}

// DropZone Component
function DropZone({ id, className, children }: { id: string; className?: string; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`${className} ${isOver ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' : ''}`}
    >
      {children}
    </div>
  );
}

// Standardized Widget Styles - für absolute Konsistenz
const WIDGET_STYLES = {
  // Container Styles
  container: "p-6 rounded-2xl transition-all duration-300 h-[450px] flex flex-col",
  
  // Header Styles  
  header: "flex items-center gap-4 mb-4",
  iconContainer: "w-16 h-16 rounded-full flex items-center justify-center shadow-lg flex-shrink-0",
  title: "text-xl font-semibold text-left",
  
  // Content Styles
  content: "space-y-3 overflow-y-auto hidden-scrollbar flex-1",
  
  // Text Styles - einheitlich für alle Widgets
  itemTitle: "text-sm font-medium",
  itemSubtext: "text-xs",
  emptyTitle: "text-lg font-semibold mb-2",
  emptySubtext: "text-sm",
  
  // Interactive Elements
  itemContainer: "group flex items-center justify-between px-3 py-2 hover:bg-white/5 dark:hover:bg-gray-700/30 rounded-lg cursor-pointer transition-all duration-200",
  actionButton: "p-2 transition-colors rounded-lg",
  
  // Spacing
  spacing: {
    items: "space-y-2",
    itemsCompact: "space-y-1", // Für Today Tasks mit reduzierten Abständen
    sections: "space-y-4",
    inline: "space-x-2"
  }
};

// Standardized Widget Component
const StandardWidget = ({ 
  icon, 
  title, 
  accentColor, 
  children, 
  isMinimalDesign,
  footerAction,
  headerAction
}: {
  icon: string;
  title: string;
  accentColor: string;
  children: React.ReactNode;
  isMinimalDesign: boolean;
  footerAction?: React.ReactNode;
  headerAction?: React.ReactNode;
}) => (
  <div className={`${WIDGET_STYLES.container} ${
    isMinimalDesign 
      ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg'
      : 'glass-effect'
  }`}>
    <div className={WIDGET_STYLES.header}>
      <div 
        className={`${WIDGET_STYLES.iconContainer} ${
          isMinimalDesign
            ? 'bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
            : ''
        }`}
        style={!isMinimalDesign ? {
          background: `${accentColor}20`,
          border: `1px solid ${accentColor}30`
        } : undefined}
      >
        <MaterialIcon name={icon} size={32} style={{ color: accentColor }} />
      </div>
      <h3 className={`${WIDGET_STYLES.title} text-gray-900 dark:text-white flex-1`} 
          style={{ fontFamily: "'Roboto', sans-serif" }}>
        {title}
      </h3>
      {headerAction}
    </div>
    <div className={WIDGET_STYLES.content}>
      {children}
    </div>
    {footerAction && (
      <div className="mt-4 pt-3 border-t border-gray-200/50 dark:border-gray-700/50 flex justify-end">
        {footerAction}
      </div>
    )}
  </div>
);

// Standardized Empty State Component
const EmptyState = ({ 
  title, 
  subtitle, 
  isMinimalDesign 
}: {
  title: string;
  subtitle: string;
  isMinimalDesign: boolean;
}) => (
  <div className="flex flex-col items-center justify-center h-full text-center">
    <p className={`${WIDGET_STYLES.emptyTitle} text-gray-900 dark:text-white`} 
       style={{ 
         fontFamily: "'Roboto', sans-serif"
       }}>
      {title}
    </p>
    <p className={`${WIDGET_STYLES.emptySubtext} text-gray-600 dark:text-gray-400`} 
       style={{ 
         fontFamily: "'Roboto', sans-serif"
       }}>
      {subtitle}
    </p>
  </div>
);

// Standardized Task Item Component - Version ohne Checkmarks für Today Tasks
const TaskItem = ({ 
  task, 
  onComplete, 
  onClick, 
  isMinimalDesign,
  showDeadline = false,
  showCheckmark = true 
}: {
  task: any;
  onComplete: (id: string) => void;
  onClick: (id: string) => void;
  isMinimalDesign: boolean;
  showDeadline?: boolean;
  showCheckmark?: boolean;
}) => (
  <div 
    className={WIDGET_STYLES.itemContainer}
    onClick={() => onClick(task.id)}
  >
    <div className="flex items-center space-x-3 flex-1 min-w-0">
      {showCheckmark && (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onComplete(task.id);
        }}
        className={`flex-shrink-0 ${WIDGET_STYLES.actionButton} text-gray-400 hover:text-green-500`}
      >
        <Circle className="w-4 h-4" />
      </button>
      )}
      <div className="flex-1 min-w-0">
        <span className={`block ${WIDGET_STYLES.itemTitle} truncate text-gray-900 dark:text-white`}
              style={{ fontFamily: "'Roboto', sans-serif" }}>
          {task.title}
        </span>
        {showDeadline && task.dueDate && (
          <span className={`block ${WIDGET_STYLES.itemSubtext} text-gray-500 dark:text-gray-400`}
                style={{ 
                  textShadow: isMinimalDesign ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.3)',
                  fontFamily: "'Roboto', sans-serif"
                }}>
            {format(new Date(task.dueDate), 'dd.MM.yyyy')}
          </span>
        )}
      </div>
    </div>
  </div>
);

export function SimpleTodayView({ onNavigate }: TodayViewProps = {}) {
  const { state, dispatch } = useApp();
  const { triggerCelebration } = useCelebration();
  const { t, i18n } = useTranslation();
  const { simpleTodayView, header, forms } = useAppTranslation();
  
  // Check if minimal design is enabled
  const isMinimalDesign = state.preferences.minimalDesign;
  
  // Utility function for dynamic accent colors
  const getAccentColorStyles = () => {
    const accentColor = state.preferences.accentColor;
    return {
      bg: { backgroundColor: accentColor },
      bgHover: { backgroundColor: accentColor + 'dd' },
      text: { color: accentColor },
      border: { borderColor: accentColor }
    };
  };
  const [searchQuery, setSearchQuery] = useState('');
  // 🔍 Performance Boost: Debounced search für Today View
  const debouncedSearchQuery = useDebounce(searchQuery, 300); // 300ms Delay
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showNavigation, setShowNavigation] = useState(false);

  
  // Checklist state
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  
  // Load checklist items: prefer global state; fallback to stored keys
  useEffect(() => {
    try {
      if (Array.isArray(state.checklistItems) && state.checklistItems.length > 0) {
        setChecklistItems(state.checklistItems as any);
        return;
      }
      const savedUnified = localStorage.getItem('taskfuchs-checklist-items') || localStorage.getItem('checklistItems');
      if (savedUnified) {
        const parsed = JSON.parse(savedUnified);
        if (Array.isArray(parsed)) {
          setChecklistItems(parsed);
        }
      }
    } catch (error) {
      console.error('Error loading checklist items:', error);
    }
  }, []);
  
  // Keep local state in sync if global changes elsewhere (e.g., ChecklistWidget)
  useEffect(() => {
    try {
      const a = JSON.stringify(state.checklistItems || []);
      const b = JSON.stringify(checklistItems || []);
      if (a !== b) {
        setChecklistItems(state.checklistItems as any);
      }
    } catch {}
  }, [state.checklistItems]);
  
  // Do not write from here; AppContext persists global checklistItems.
  
  const [newItemText, setNewItemText] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [checkedReminders, setCheckedReminders] = useState<Set<string>>(new Set());
  
  // Reminder state
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedItemForReminder, setSelectedItemForReminder] = useState<ChecklistItem | null>(null);
  
  // Task modal state
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showSmartTaskModal, setShowSmartTaskModal] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [lastArchivedTaskId, setLastArchivedTaskId] = useState<string | null>(null);
  
  // Note modal state
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editedNoteContent, setEditedNoteContent] = useState('');
  const [editedNoteTitle, setEditedNoteTitle] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Autosave timer
  const autosaveTimerRef = React.useRef<number | null>(null);
  
  // Search state
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState<{tasks: Task[], notes: any[]}>({tasks: [], notes: []});
  
  // End-of-day modal state
  const [showEndOfDayModal, setShowEndOfDayModal] = useState(false);
  
  // Customization panel state
  const [showCustomizePanel, setShowCustomizePanel] = useState(false);
  const [showThemePairs, setShowThemePairs] = useState(false);
  const customizePanelRef = React.useRef<HTMLDivElement>(null);
  
  // Close customize panel on ESC or click outside
  useEffect(() => {
    if (!showCustomizePanel) return;
    
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowCustomizePanel(false);
      }
    };
    
    const handleClickOutside = (e: MouseEvent) => {
      if (customizePanelRef.current && !customizePanelRef.current.contains(e.target as Node)) {
        // Also check if the click was on the customize button itself
        const customizeButton = document.querySelector('[data-customize-button]');
        if (customizeButton && customizeButton.contains(e.target as Node)) {
          return; // Let the button's onClick handle it
        }
        setShowCustomizePanel(false);
      }
    };
    
    document.addEventListener('keydown', handleEsc);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCustomizePanel]);

  // Checklist reminder modal state
  const [showChecklistReminderModal, setShowChecklistReminderModal] = useState(false);
  const [currentReminderItem, setCurrentReminderItem] = useState<ChecklistItem | null>(null);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    itemId: string;
    type: 'active' | 'completed';
  } | null>(null);
  
  // Edit checklist item state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  
  // Drag and drop state
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  
  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );
  
  // Check reminders
  useEffect(() => {
    const checkChecklistReminders = () => {
      const now = new Date();
      const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
      const today = now.toISOString().split('T')[0];

      // Find checklist items with reminders that should be shown now
      const itemsWithReminders = checklistItems.filter(item => 
        !item.completed &&
        item.reminderDate === today &&
        item.reminderTime &&
        !checkedReminders.has(`${item.id}-${item.reminderDate}-${item.reminderTime}`)
      );

      for (const item of itemsWithReminders) {
        if (item.reminderTime) {
          const [itemHour, itemMinute] = item.reminderTime.split(':').map(Number);
          const [currentHour, currentMinute] = currentTime.split(':').map(Number);
          
          // Check if current time matches reminder time (within 1 minute window)
          const itemTimeInMinutes = itemHour * 60 + itemMinute;
          const currentTimeInMinutes = currentHour * 60 + currentMinute;
          
          const timeDiff = Math.abs(currentTimeInMinutes - itemTimeInMinutes);
          
          if (timeDiff <= 1) {
            console.log(`🔔 Checklist reminder: "${item.text}" at ${item.reminderTime}`);
            
            // Mark this reminder as checked to avoid duplicate notifications
            setCheckedReminders(prev => new Set([...prev, `${item.id}-${item.reminderDate}-${item.reminderTime}`]));
            
            // Show warning modal
            setCurrentReminderItem(item);
            setShowChecklistReminderModal(true);
            
            // Show desktop notification
            notificationService.showNotification({
              title: `Checkliste: ${item.text}`,
              body: simpleTodayView.reminderNotification(),
              icon: '/3d_fox.png',
              tag: `checklist-${item.id}`,
              requireInteraction: true,
              onClick: () => {
                // Focus window and scroll to checklist
                window.focus();
                const checklistElement = document.getElementById('checklist-widget');
                if (checklistElement) {
                  checklistElement.scrollIntoView({ behavior: 'smooth' });
                }
              }
            });
            
            // Play notification sound if enabled
            if (state.preferences.sounds) {
              const audio = new Audio('/notification-sound.mp3');
              audio.volume = state.preferences.soundVolume;
              audio.play().catch(() => {
                // Fallback: simple beep if audio file is not available
                try {
                  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                  const oscillator = audioContext.createOscillator();
                  const gainNode = audioContext.createGain();
                  
                  oscillator.connect(gainNode);
                  gainNode.connect(audioContext.destination);
                  
                  oscillator.frequency.value = 800;
                  oscillator.type = 'sine';
                  gainNode.gain.value = state.preferences.soundVolume * 0.3;
                  
                  oscillator.start();
                  oscillator.stop(audioContext.currentTime + 0.3);
                } catch (audioError) {
                  console.warn('Could not play notification sound:', audioError);
                }
              });
            }
            
            break; // Show only one reminder at a time
          }
        }
      }
    };

    // Check reminders every minute
    const interval = setInterval(checkChecklistReminders, 60000);
    
    // Also check immediately
    checkChecklistReminders();

    return () => clearInterval(interval);
  }, [checklistItems, state.preferences.sounds, state.preferences.soundVolume]);

  // Clear checked reminders at midnight to allow for daily reminders
  useEffect(() => {
    const checkMidnight = () => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        setCheckedReminders(new Set());
      }
    };

    const midnightInterval = setInterval(checkMidnight, 60000);
    return () => clearInterval(midnightInterval);
  }, []);

  // Check current theme
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
  }, [state.preferences.theme]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
    };

    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

  // Listen for 'open-end-of-day-modal' event (from onboarding)
  useEffect(() => {
    const handleOpenEndOfDayModal = () => {
      setShowEndOfDayModal(true);
    };
    
    window.addEventListener('open-end-of-day-modal', handleOpenEndOfDayModal);
    return () => window.removeEventListener('open-end-of-day-modal', handleOpenEndOfDayModal);
  }, []);

  // Overlay styles removed - no background overlays in today view

  // Toggle theme
  const toggleTheme = () => {
    const currentTheme = state.preferences.theme;
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    dispatch({ 
      type: 'UPDATE_PREFERENCES', 
      payload: { theme: newTheme } 
    });
  };

  // Handle settings navigation
  const handleSettings = () => {
    window.dispatchEvent(new CustomEvent('navigate-to-settings'));
  };

  // Handle search across tasks and notes
  const handleSearch = () => {
    if (searchQuery.trim()) {
      dispatch({ type: 'SET_SEARCH_QUERY', payload: searchQuery });
      dispatch({ type: 'SET_NOTES_SEARCH', payload: searchQuery });
      onNavigate?.('tasks');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      handleSearch();
    }
    if (e.key === 'Escape') {
      setShowSearchResults(false);
      setSearchQuery('');
    }
  };

  // Live search function - jetzt mit debounced query und erweiterte Tag-Suche
  const performLiveSearch = useCallback((query: string) => {
    if (!query.trim()) {
      setSearchResults({tasks: [], notes: []});
      setShowSearchResults(false);
      return;
    }

    const searchTerm = query.toLowerCase();
    
    // Verbesserte Tag-Suche: Entferne # für Tag-spezifische Suche
    const isTagSearch = searchTerm.startsWith('#');
    const tagSearchTerm = isTagSearch ? searchTerm.substring(1) : searchTerm;
    
    // Search tasks
    const matchingTasks = state.tasks.filter(task => {
      // Standard text search
      const textMatch = task.title.toLowerCase().includes(searchTerm) ||
                       task.description?.toLowerCase().includes(searchTerm);
      
      // Enhanced tag search - unterstützt sowohl #tag als auch tag
      const tagMatch = task.tags.some(tag => {
        const tagLower = tag.toLowerCase();
        // Direkte Suche (für normale Texteingabe)
        if (tagLower.includes(searchTerm)) return true;
        // Tag-spezifische Suche (für #tag Eingabe)
        if (isTagSearch && tagLower.includes(tagSearchTerm)) return true;
        return false;
      });
      
      return textMatch || tagMatch;
    }).slice(0, 10);

    // Search notes (erweitert mit Tag-Suche)
    const matchingNotes = (state.notes?.notes || []).filter(note => {
      // Standard text search
      const textMatch = note.title?.toLowerCase().includes(searchTerm) ||
                       note.content?.toLowerCase().includes(searchTerm);
      
      // Tag search für Notizen
      const tagMatch = note.tags?.some(tag => {
        const tagLower = tag.toLowerCase();
        // Direkte Suche (für normale Texteingabe)
        if (tagLower.includes(searchTerm)) return true;
        // Tag-spezifische Suche (für #tag Eingabe)
        if (isTagSearch && tagLower.includes(tagSearchTerm)) return true;
        return false;
      }) || false;
      
      return textMatch || tagMatch;
    }).slice(0, 10);

    setSearchResults({tasks: matchingTasks, notes: matchingNotes});
    setShowSearchResults(true);
  }, [state.tasks, state.notes]);

  // Effect für debounced search
  useEffect(() => {
    performLiveSearch(debouncedSearchQuery);
  }, [debouncedSearchQuery, performLiveSearch]);

  const handleSearchQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
  };

  const handleSearchResultClick = (type: 'task' | 'note', item: any) => {
    setShowSearchResults(false);
    if (type === 'task') {
      setSelectedTaskId(item.id);
      setShowTaskModal(true);
    } else {
      // Open note in overlay
      setSelectedNote(item);
      setShowNoteModal(true);
    }
  };

  const handleNoteClick = (note: any) => {
    setSelectedNote(note);
    setEditedNoteTitle(note.title || '');
    setEditedNoteContent(note.content || '');
    // Start in preview mode for existing notes, edit mode for new/empty notes
    setIsEditingNote(!note.title && !note.content);
    setHasUnsavedChanges(false);
    setShowNoteModal(true);
  };

  const handleCloseNoteModal = () => {
    // Clear autosave timer
    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    
    if (hasUnsavedChanges) {
      if (confirm(simpleTodayView.unsavedChanges())) {
        setShowNoteModal(false);
        setSelectedNote(null);
        setIsEditingNote(false);
        setHasUnsavedChanges(false);
      }
    } else {
      setShowNoteModal(false);
      setSelectedNote(null);
      setIsEditingNote(false);
      setHasUnsavedChanges(false);
    }
  };

  const handleSaveNote = () => {
    if (!selectedNote || !hasUnsavedChanges) return;
    
    // Clear autosave timer
    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    
    const updatedNote = {
      ...selectedNote,
              title: editedNoteTitle.trim() || (i18n.language === 'en' ? 'Untitled Note' : 'Unbenannte Notiz'),
      content: editedNoteContent,
      updatedAt: new Date().toISOString()
    };
    
    dispatch({ type: 'UPDATE_NOTE', payload: updatedNote });
    setSelectedNote(updatedNote);
    setHasUnsavedChanges(false);
    // Autosave should NOT change editing status
    
    // Show notification
    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: {
        id: generateId(),
        type: 'success',
        title: 'Notiz gespeichert',
        message: 'Automatisch gespeichert',
        timestamp: new Date().toISOString(),
        read: false
      }
    });
  };

  const handleContentClick = () => {
    if (!isEditingNote) {
      setIsEditingNote(true);
    }
  };

  const handleContentChange = (content: string) => {
    setEditedNoteContent(content);
    setHasUnsavedChanges(true);
    
    // Clear existing autosave timer
    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }
    
    // Set new autosave timer (save after 2 seconds of inactivity)
    autosaveTimerRef.current = window.setTimeout(() => {
      handleSaveNote();
    }, 2000);
  };

  const handleTitleChange = (title: string) => {
    setEditedNoteTitle(title);
    setHasUnsavedChanges(true);
    
    // Clear existing autosave timer
    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }
    
    // Set new autosave timer (save after 2 seconds of inactivity)
    autosaveTimerRef.current = window.setTimeout(() => {
      handleSaveNote();
    }, 2000);
  };

  // Handle ESC key and outside clicks
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && showNoteModal) {
      handleCloseNoteModal();
    }
  };

  const handleModalBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCloseNoteModal();
    }
  };

  // WYSIWYG Editor Functions
  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = document.getElementById('note-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = editedNoteContent.substring(start, end);
    const newText = editedNoteContent.substring(0, start) + before + selectedText + after + editedNoteContent.substring(end);
    
    // Use handleContentChange to trigger autosave
    handleContentChange(newText);
    
    // Focus and set cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  const insertHeading = (level: number) => {
    const prefix = '#'.repeat(level) + ' ';
    insertMarkdown(prefix);
  };

  const insertList = (ordered: boolean = false) => {
    const prefix = ordered ? '1. ' : '- ';
    insertMarkdown(prefix);
  };

  const insertCheckbox = () => {
    insertMarkdown('- [ ] ');
  };

  const insertHorizontalRule = () => {
    insertMarkdown('\n\n---\n\n');
  };

  const insertLink = () => {
    const url = prompt('URL eingeben:');
    if (url) {
      const text = prompt(simpleTodayView.linkTextPrompt()) || url;
      insertMarkdown(`[${text}](${url})`);
    }
  };

  // Trigger autosave when content changes programmatically
  const triggerAutosave = () => {
    // Clear existing autosave timer
    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }
    
    // Set new autosave timer (save after 2 seconds of inactivity)
    autosaveTimerRef.current = window.setTimeout(() => {
      handleSaveNote();
    }, 2000);
  };

  // Handle Enter key for list continuation (like in Notes editor)
  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      const textarea = e.currentTarget;
      const { selectionStart, value } = textarea;
      
      // Find the current line
      const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
      const lineEnd = value.indexOf('\n', selectionStart);
      const currentLine = value.substring(lineStart, lineEnd === -1 ? value.length : lineEnd);
      
      // Check if current line is a list item
      const unorderedListMatch = currentLine.match(/^(\s*)-\s(.*)$/);
      const orderedListMatch = currentLine.match(/^(\s*)(\d+)\.\s(.*)$/);
      const checkboxMatch = currentLine.match(/^(\s*)-\s\[([ x])\]\s(.*)$/);
      
      if (unorderedListMatch && unorderedListMatch[2].trim() !== '') {
        // Continue unordered list  
        e.preventDefault();
        const indent = unorderedListMatch[1];
        const newText = value.substring(0, selectionStart) + '\n' + indent + '- ' + value.substring(selectionStart);
        setEditedNoteContent(newText);
        setHasUnsavedChanges(true);
        triggerAutosave();
        
        // Set cursor position
        setTimeout(() => {
          const newPosition = selectionStart + indent.length + 3;
          textarea.setSelectionRange(newPosition, newPosition);
        }, 0);
      } else if (orderedListMatch && orderedListMatch[3].trim() !== '') {
        // Continue ordered list
        e.preventDefault();
        const indent = orderedListMatch[1];
        const nextNumber = parseInt(orderedListMatch[2]) + 1;
        const newText = value.substring(0, selectionStart) + '\n' + indent + nextNumber + '. ' + value.substring(selectionStart);
        setEditedNoteContent(newText);
        setHasUnsavedChanges(true);
        triggerAutosave();
        
        // Set cursor position
        setTimeout(() => {
          const newPosition = selectionStart + indent.length + nextNumber.toString().length + 3;
          textarea.setSelectionRange(newPosition, newPosition);
        }, 0);
      } else if (checkboxMatch) {
        // Continue checkbox list (whether it has content or not)
        if (checkboxMatch[3].trim() !== '') {
          // Non-empty checkbox - continue the list
          e.preventDefault();
          const indent = checkboxMatch[1];
          const newText = value.substring(0, selectionStart) + '\n' + indent + '- [ ] ' + value.substring(selectionStart);
          setEditedNoteContent(newText);
          setHasUnsavedChanges(true);
          triggerAutosave();
          
          // Set cursor position
          setTimeout(() => {
            const newPosition = selectionStart + indent.length + 6;
            textarea.setSelectionRange(newPosition, newPosition);
          }, 0);
        } else {
          // Empty checkbox - remove it and exit list mode
          e.preventDefault();
          const newText = value.substring(0, lineStart) + value.substring(selectionStart);
          setEditedNoteContent(newText);
          setHasUnsavedChanges(true);
          triggerAutosave();
          
          // Set cursor position
          setTimeout(() => {
            textarea.setSelectionRange(lineStart, lineStart);
          }, 0);
        }
      } else if ((unorderedListMatch && unorderedListMatch[2].trim() === '') || 
                 (orderedListMatch && orderedListMatch[3].trim() === '')) {
        // Empty list item - remove it and exit list mode
        e.preventDefault();
        const newText = value.substring(0, lineStart) + value.substring(selectionStart);
        setEditedNoteContent(newText);
        setHasUnsavedChanges(true);
        triggerAutosave();
        
        // Set cursor position
        setTimeout(() => {
          textarea.setSelectionRange(lineStart, lineStart);
        }, 0);
      }
    }
  };

  // Add event listeners
  React.useEffect(() => {
    if (showNoteModal) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [showNoteModal]);

  // Cleanup autosave timer on unmount
  React.useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  // Complete Markdown rendering function (identical to Notes)
  const renderMarkdown = (markdown: string) => {
    if (!markdown) return <p className="text-gray-500 dark:text-gray-400 italic">{simpleTodayView.emptyNote()}</p>;
    
    const lines = markdown.split('\n');
    const elements: React.ReactElement[] = [];
    let key = 0;

    for (const line of lines) {
      key++;
      
      // Images - Process images first, then remove them from the line for other processing
      const imageMatches = line.match(/!\[([^\]]*)\]\(([^)]+)\)/g);
      if (imageMatches) {
        let lineProcessed = false;
        imageMatches.forEach(match => {
          const imageMatch = match.match(/!\[([^\]]*)\]\(([^)]+)\)/);
          if (imageMatch) {
            const [, alt, src] = imageMatch;
            elements.push(
              <div key={key++} className="my-4">
                <img 
                  src={src} 
                  alt={alt} 
                  className="max-w-full h-auto rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
                  style={{ maxHeight: '500px', objectFit: 'contain' }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const errorDiv = target.nextElementSibling as HTMLElement;
                    if (errorDiv) errorDiv.style.display = 'block';
                  }}
                  onLoad={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'block';
                    const errorDiv = target.nextElementSibling as HTMLElement;
                    if (errorDiv) errorDiv.style.display = 'none';
                  }}
                />
                <div 
                  className="text-sm text-gray-500 dark:text-gray-400 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 mt-2" 
                  style={{ display: 'none' }}
                >
                  <span>❌ Fehler beim Laden des Bildes:</span><br />
                  <code className="text-xs break-all">{src}</code>
                  <br />
                  <small className="text-xs opacity-75">Original: ![{alt}]({src})</small>
                </div>
              </div>
            );
            lineProcessed = true;
          }
        });
        if (lineProcessed) continue;
      }
      
      // Headers
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={key} className="text-2xl font-bold mb-4 mt-12 first:mt-0" style={getAccentColorStyles().text}>
            {line.substring(2)}
          </h1>
        );
        continue;
      }
      
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={key} className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-10 first:mt-0">
            {line.substring(3)}
          </h2>
        );
        continue;
      }
      
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={key} className="text-lg font-medium text-gray-900 dark:text-white mb-2 mt-8 first:mt-0">
            {line.substring(4)}
          </h3>
        );
        continue;
      }
      
      // Checkboxes
      const checkboxMatch = line.match(/^- \[([ x])\] (.+)$/);
      if (checkboxMatch) {
        const [, checked, text] = checkboxMatch;
        elements.push(
          <div key={key} className="flex items-start space-x-2 mb-2">
            <input 
              type="checkbox" 
              checked={checked === 'x'} 
              disabled 
              className="mt-1 flex-shrink-0" 
              style={{ accentColor: state.preferences.accentColor }}
            />
            <span className={`flex-1 ${checked === 'x' ? 'line-through text-gray-500 dark:text-gray-400' : ''}`}>
              {formatInlineMarkdown(text)}
            </span>
          </div>
        );
        continue;
      }
      
      // Lists
      const listMatch = line.match(/^- (.+)$/);
      if (listMatch) {
        elements.push(
          <div key={key} className="flex items-start space-x-2 mb-0.5">
            <span className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={getAccentColorStyles().bg}></span>
            <span className="flex-1">{formatInlineMarkdown(listMatch[1])}</span>
          </div>
        );
        continue;
      }
      
      // Numbered lists
      const numberedMatch = line.match(/^(\d+)\. (.+)$/);
      if (numberedMatch) {
        elements.push(
          <div key={key} className="flex items-start space-x-2 mb-0.5">
            <span className="font-medium min-w-[1.5rem] flex-shrink-0" style={getAccentColorStyles().text}>{numberedMatch[1]}.</span>
            <span className="flex-1">{formatInlineMarkdown(numberedMatch[2])}</span>
          </div>
        );
        continue;
      }
      
      // Horizontal rule
      if (line === '---') {
        elements.push(<hr key={key} className="border-gray-300 dark:border-gray-600 my-6" />);
        continue;
      }
      
      // Regular paragraph
      if (line.trim()) {
        elements.push(
          <p key={key} className="mb-2">
            {formatInlineMarkdown(line)}
          </p>
        );
      } else {
        elements.push(<br key={key} />);
      }
    }
    
    return <div>{elements}</div>;
  };

  // Format inline markdown (images, links, bold, italic, code)
  const formatInlineMarkdown = (text: string) => {
    const parts = [];
    let remaining = text;
    let key = 0;
    
    while (remaining.length > 0) {
      // Images first (to avoid conflicts with links)
      const imageMatch = remaining.match(/!\[([^\]]*)\]\(([^)]+)\)/);
      if (imageMatch) {
        const beforeImage = remaining.substring(0, imageMatch.index);
        if (beforeImage) {
          parts.push(formatTextMarkdown(beforeImage, key++));
        }
        const [, alt, src] = imageMatch;
        parts.push(
          <img 
            key={key++}
            src={src} 
            alt={alt} 
            className="inline-block max-w-full h-auto rounded border border-gray-200 dark:border-gray-700 my-1"
            style={{ maxHeight: '200px', objectFit: 'contain' }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.outerHTML = `<span class="text-red-500 text-sm">[❌ Bild nicht gefunden: ${src}]</span>`;
            }}
          />
        );
        remaining = remaining.substring((imageMatch.index || 0) + imageMatch[0].length);
        continue;
      }
      
      // Links (without images) - Check that it's not preceded by !
      const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch && !remaining.substring(0, linkMatch.index).endsWith('!')) {
        const beforeLink = remaining.substring(0, linkMatch.index);
        if (beforeLink) {
          parts.push(formatTextMarkdown(beforeLink, key++));
        }
        parts.push(
          <a 
            key={key++}
            href={linkMatch[2]} 
            className="hover:opacity-80 underline decoration-2 underline-offset-2 transition-colors inline-flex items-center"
            style={getAccentColorStyles().text} 
            target="_blank" 
            rel="noopener noreferrer"
          >
            {linkMatch[1]} <span className="inline-block w-3 h-3 ml-1 opacity-60">↗</span>
          </a>
        );
        remaining = remaining.substring((linkMatch.index || 0) + linkMatch[0].length);
        continue;
      }
      
      // No more special formatting found, process the rest
      parts.push(formatTextMarkdown(remaining, key++));
      break;
    }
    
    return <span>{parts}</span>;
  };

  const formatTextMarkdown = (text: string, key: number) => {
    return (
      <span key={key} dangerouslySetInnerHTML={{
        __html: text
          .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
          .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
          .replace(/`(.*?)`/g, '<code class="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
      }} />
    );
  };

  // Handle task completion
  const handleCompleteTask = (taskId: string) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (task) {
      // Trigger celebration animation
      triggerCelebration();
      
      dispatch({
        type: 'UPDATE_TASK',
        payload: { ...task, completed: true, completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      });
    }
  };

  // Handle task click to open modal in dashboard
  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setShowTaskModal(true);
  };

  // Handle task modal close
  const handleCloseTaskModal = () => {
    setShowTaskModal(false);
    setSelectedTaskId(null);
  };

  // Handle smart task modal
  const handleCreateNewTask = () => {
    setShowSmartTaskModal(true);
  };

  const handleCloseSmartTaskModal = () => {
    setShowSmartTaskModal(false);
  };

  // Handle create new note
  const handleCreateNewNote = () => {
    const newNote = {
      id: generateId(),
      title: '',
      content: '',
      tags: [],
      linkedTasks: [],
      linkedNotes: [],
      linkedProjects: [],
      pinned: false,
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    dispatch({ type: 'ADD_NOTE', payload: newNote });
    dispatch({ type: 'SELECT_NOTE', payload: newNote });
    dispatch({ type: 'SET_NOTES_EDITING', payload: true });
    onNavigate?.('notes');
  };

  // Checklist functions
  const handleAddItem = () => {
    if (newItemText.trim()) {
      const newItem: ChecklistItem = {
        id: generateId(),
        text: newItemText.trim(),
        completed: false,
        createdAt: new Date().toISOString()
      };
      setChecklistItems(prev => [newItem, ...prev]);
      setNewItemText('');
      // Keep adding mode active for next entry
      // Don't set isAdding to false here
    }
  };

  const handleToggleItem = (itemId: string) => {
    setChecklistItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handleDeleteItem = (itemId: string) => {
    setChecklistItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleStartEdit = (item: ChecklistItem) => {
    setEditingItemId(item.id);
    setEditingText(item.text);
  };

  const handleSaveEdit = () => {
    if (editingItemId && editingText.trim()) {
      const updatedItems = checklistItems.map(item =>
        item.id === editingItemId
          ? { ...item, text: editingText.trim() }
          : item
      );
      setChecklistItems(updatedItems);
      localStorage.setItem('checklistItems', JSON.stringify(updatedItems));
    }
    setEditingItemId(null);
    setEditingText('');
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditingText('');
  };



  const handleSetReminder = (item: ChecklistItem) => {
    setSelectedItemForReminder(item);
    setShowReminderModal(true);
  };



  const handleSaveReminder = (reminderDate: string, reminderTime: string) => {
    if (selectedItemForReminder) {
      setChecklistItems(prev =>
        prev.map(item =>
          item.id === selectedItemForReminder.id
            ? { ...item, reminderDate, reminderTime }
            : item
        )
      );
      
      // Remove from checked reminders so it can trigger again
      setCheckedReminders(prev => {
        const newSet = new Set(prev);
        newSet.delete(`${selectedItemForReminder.id}-${selectedItemForReminder.reminderDate}-${selectedItemForReminder.reminderTime}`);
        return newSet;
      });
    }
    setShowReminderModal(false);
    setSelectedItemForReminder(null);
  };

  const handleRemoveReminder = (item: ChecklistItem) => {
    setChecklistItems(prev =>
      prev.map(listItem =>
        listItem.id === item.id
          ? { ...listItem, reminderDate: undefined, reminderTime: undefined }
          : listItem
      )
    );
    
    // Remove from checked reminders
    setCheckedReminders(prev => {
      const newSet = new Set(prev);
      newSet.delete(`${item.id}-${item.reminderDate}-${item.reminderTime}`);
      return newSet;
    });
  };



  const handleConvertToTask = (item: ChecklistItem) => {
    const newTask = {
      id: generateId(),
      title: item.text,
      description: '',
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      columnId: 'inbox',
      tags: [],
      subtasks: [],
      priority: 'medium' as const,
      position: Date.now()
    };

    dispatch({ type: 'ADD_TASK', payload: newTask });
    handleDeleteItem(item.id);
    
    // Show notification
    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: {
        id: generateId(),
        type: 'success',
        title: simpleTodayView.taskCreated(),
        message: `"${item.text}" wurde zum Eingang hinzugefügt`,
        timestamp: new Date().toISOString(),
        read: false
      }
    });
  };

  const handleChecklistKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddItem();
      // Input stays focused for next entry
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setNewItemText('');
    }
  };

  // Get today's tasks from the task board (from today's date column)
  const todayDateString = format(new Date(), 'yyyy-MM-dd');
  const todayColumnId = `date-${todayDateString}`;
  const todayTasks = state.tasks
    .filter(task => {
      return !task.completed && task.columnId === todayColumnId;
    })
    .sort((a, b) => a.position - b.position);

  // Calculate total estimated time for today's tasks
  const totalEstimatedTime = todayTasks.reduce((total, task) => {
    const taskTime = task.estimatedTime || 0;
    const subtaskTime = task.subtasks?.reduce((subTotal: number, subtask: any) => 
      subTotal + (subtask.completed ? 0 : (subtask.estimatedTime || 0)), 0) || 0;
    return total + taskTime + subtaskTime;
  }, 0);

  // Format time display
  const formatTime = (minutes: number) => {
    if (minutes === 0) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Get yesterday's tasks from yesterday's date column
  const yesterdayDateString = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const yesterdayColumnId = `date-${yesterdayDateString}`;
  const yesterdayTasks = state.tasks
    .filter(task => {
      return !task.completed && task.columnId === yesterdayColumnId;
    })
    .sort((a, b) => a.position - b.position);

  // Get pinned notes (correctly accessing the notes state)
  const pinnedNotes = (Array.isArray(state.notes?.notes) ? state.notes.notes : []).filter(note => note.pinned && !note.archived);

  // Get "Heute wichtig" tasks - three categories
  const todayImportantTasks = {
    deadlines: state.tasks.filter(task => {
      if (task.completed || !task.deadline) return false;
      const deadlineDate = new Date(task.deadline);
      return isToday(deadlineDate) || isPast(deadlineDate);
    }),
    reminders: state.tasks.filter(task => {
      if (task.completed || !task.reminderDate || !task.reminderTime) return false;
      const reminderDate = new Date(task.reminderDate);
      return isToday(reminderDate);
    }),
    highPriority: state.tasks.filter(task => {
      if (task.completed || task.priority !== 'high') return false;
      // Check if task is in today's column or has today's date
      const isInTodayColumn = task.columnId?.startsWith('date-') && 
        isToday(new Date(task.columnId.replace('date-', '')));
      return isInTodayColumn || (task.reminderDate && isToday(new Date(task.reminderDate)));
    })
  };

  const allImportantTasks = [
    ...todayImportantTasks.deadlines,
    ...todayImportantTasks.reminders,
    ...todayImportantTasks.highPriority
  ].filter((task, index, self) => 
    // Remove duplicates by id
    self.findIndex(t => t.id === task.id) === index
  );

  // Get active and completed checklist items
  const activeItems = checklistItems.filter(item => !item.completed);
  const completedItems = checklistItems.filter(item => item.completed);

  const handleCompleteChecklistItem = (itemId: string) => {
    setChecklistItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, completed: true } : item
      )
    );
    setShowChecklistReminderModal(false);
    setCurrentReminderItem(null);
  };

  // Drag and Drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const task = state.tasks.find(t => t.id === event.active.id);
    if (task) {
      setActiveTask(task);
      // Add slight haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setOverId(over ? over.id as string : null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveTask(null);
    setOverId(null);

    if (!over) {
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;
    const activeTask = state.tasks.find(t => t.id === activeId);
    
    if (!activeTask) {
      return;
    }

    // Handle reordering within today tasks (drag between tasks)
    if (activeId !== overId && activeTask.columnId === todayColumnId) {
      const currentTodayTasks = state.tasks
        .filter(task => task.columnId === todayColumnId && !task.completed)
        .sort((a, b) => a.position - b.position);
      
      const oldIndex = currentTodayTasks.findIndex(t => t.id === activeId);
      const newIndex = currentTodayTasks.findIndex(t => t.id === overId);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedTasks = arrayMove(currentTodayTasks, oldIndex, newIndex);
        
        // Update positions for all reordered tasks
        reorderedTasks.forEach((task, index) => {
          if (task.position !== index) {
            dispatch({
              type: 'UPDATE_TASK',
              payload: {
                ...task,
                position: index,
                updatedAt: new Date().toISOString()
              }
            });
          }
        });
        return;
      }
    }

    // Check if we're dropping on the today tasks drop zone
    if (overId === 'today-tasks-drop-zone') {
      // Move task to today's column
      const todayColumn = state.columns.find(col => col.id === todayColumnId);
      if (!todayColumn) return;

      // Calculate new position for task in today's column
      const todayTasks = state.tasks.filter(task => task.columnId === todayColumnId);
      const maxPosition = todayTasks.length > 0 ? Math.max(...todayTasks.map(t => t.position || 0)) : -1;

      // Update task
      dispatch({
        type: 'UPDATE_TASK',
        payload: {
          ...activeTask,
          columnId: todayColumnId,
          position: maxPosition + 1,
          reminderDate: todayDateString,
          updatedAt: new Date().toISOString()
        }
      });

      // Show success notification
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          id: `moved-task-${Date.now()}`,
          title: simpleTodayView.taskMoved(),
          message: simpleTodayView.taskMovedMessage(activeTask.title),
          timestamp: new Date().toISOString(),
          type: 'success' as const,
          read: false
        }
      });

      // Success haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([30, 10, 30]);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className={`relative min-h-screen w-full ${
        isMinimalDesign ? 'bg-white dark:bg-[#111827]' : ''
      }`}>
      {/* Background Overlay removed */}


            {/* Fixed Top Controls - Only Icons */}
      <div className="fixed top-6 right-6 z-50 flex space-x-3">
            {/* Customize Button */}
            <button
              data-customize-button
              onClick={() => setShowCustomizePanel(!showCustomizePanel)}
              className={`px-3 h-10 rounded-full flex items-center justify-center gap-2 transition-all duration-200 backdrop-blur-lg ${
                showCustomizePanel
                  ? 'text-white'
                  : isMinimalDesign
                    ? 'bg-white/90 dark:bg-gray-50/90 border border-white/50 dark:border-gray-200/50 hover:bg-white/95 dark:hover:bg-gray-50/95 text-gray-700 dark:text-gray-800'
                    : 'bg-white/85 dark:bg-gray-800/85 border border-white/40 dark:border-gray-600/40 hover:bg-white/90 dark:hover:bg-gray-800/90 text-gray-700 dark:text-gray-300'
              }`}
              style={{
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
                backgroundColor: showCustomizePanel ? state.preferences.accentColor : undefined
              }}
            >
              <MaterialIcon name="palette" size={18} style={{ color: showCustomizePanel ? 'white' : state.preferences.accentColor }} />
              <span className="text-sm font-medium">{t('common.customize')}</span>
            </button>
            
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-lg ${
                isMinimalDesign
                  ? 'bg-white/90 dark:bg-gray-50/90 border border-white/50 dark:border-gray-200/50 hover:bg-white/95 dark:hover:bg-gray-50/95'
                  : 'bg-white/85 dark:bg-gray-800/85 border border-white/40 dark:border-gray-600/40 hover:bg-white/90 dark:hover:bg-gray-800/90'
              }`}
              style={{
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
              }}
            >
              {isDarkMode ? (
                <MaterialIcon name="light_mode" size={20} style={{ color: state.preferences.accentColor }} />
              ) : (
                <MaterialIcon name="dark_mode" size={20} style={{ color: state.preferences.accentColor }} />
              )}
            </button>

          </div>
          
          {/* Customization Panel - Full Settings Layout */}
          <div 
            ref={customizePanelRef}
            className={`fixed top-20 right-6 z-40 transition-all duration-300 ease-out max-h-[calc(100vh-120px)] overflow-y-auto ${
              showCustomizePanel 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 -translate-y-4 pointer-events-none'
            }`}
          >
            <div className={`rounded-2xl p-6 backdrop-blur-xl border shadow-2xl w-[420px] ${
              isMinimalDesign
                ? 'bg-white/98 dark:bg-gray-800/98 border-gray-200/50 dark:border-gray-700/50'
                : 'bg-white/95 dark:bg-gray-900/95 border-white/30 dark:border-gray-600/30'
            }`} style={{ boxShadow: '0 25px 60px rgba(0, 0, 0, 0.2), 0 8px 20px rgba(0, 0, 0, 0.12)' }}>
              
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('common.customize')}
                </h3>
                <button
                  onClick={() => setShowCustomizePanel(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Theme Presets - Like Settings */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{state.preferences.language === 'de' ? 'Design-Voreinstellungen' : 'Theme Presets'}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  {state.preferences.language === 'de' 
                    ? 'Wähle ein vordefiniertes Theme'
                    : 'Choose a predefined theme'}
                </p>
                <div className="grid grid-cols-4 gap-3">
                  {/* Standard Theme */}
                  <button
                    onClick={() => {
                      dispatch({ type: 'UPDATE_PREFERENCES', payload: { 
                        theme: 'light', 
                        accentColor: '#f97316',
                        backgroundImage: '/backgrounds/bg12.webp',
                        backgroundType: 'image'
                      }});
                      document.documentElement.classList.remove('dark');
                    }}
                    className="group relative p-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-orange-400 transition-all bg-white dark:bg-gray-800"
                  >
                    <div className="aspect-[4/3] rounded-lg overflow-hidden mb-2 relative">
                      <img src="/backgrounds/thumbs/bg12_thumb.webp" alt="Standard" className="w-full h-full object-cover" />
                      <div className="absolute top-1 right-1 w-3 h-3 rounded-full border border-white shadow-sm" style={{ backgroundColor: '#f97316' }} />
                      <div className="absolute bottom-1 left-1 bg-white/90 rounded px-1 py-0.5">
                        <Sun className="w-2.5 h-2.5 text-amber-500" />
                      </div>
                    </div>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Standard</span>
                  </button>

                  {/* Cyan & Dark Theme */}
                  <button
                    onClick={() => {
                      dispatch({ type: 'UPDATE_PREFERENCES', payload: { 
                        theme: 'dark', 
                        accentColor: '#22d3ee',
                        backgroundImage: '/backgrounds/bg2.jpg',
                        backgroundType: 'image'
                      }});
                      document.documentElement.classList.add('dark');
                    }}
                    className="group relative p-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-cyan-400 transition-all bg-white dark:bg-gray-800"
                  >
                    <div className="aspect-[4/3] rounded-lg overflow-hidden mb-2 relative">
                      <img src="/backgrounds/thumbs/bg2_thumb.webp" alt="Cyan & Dark" className="w-full h-full object-cover" />
                      <div className="absolute top-1 right-1 w-3 h-3 rounded-full border border-white shadow-sm" style={{ backgroundColor: '#22d3ee' }} />
                      <div className="absolute bottom-1 left-1 bg-gray-900/90 rounded px-1 py-0.5">
                        <Moon className="w-2.5 h-2.5 text-blue-400" />
                      </div>
                    </div>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Cyan</span>
                  </button>

                  {/* Purple & Dark Theme */}
                  <button
                    onClick={() => {
                      dispatch({ type: 'UPDATE_PREFERENCES', payload: { 
                        theme: 'dark', 
                        accentColor: '#7b2ff2',
                        backgroundImage: '/backgrounds/bg8.jpg',
                        backgroundType: 'image'
                      }});
                      document.documentElement.classList.add('dark');
                    }}
                    className="group relative p-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-purple-500 transition-all bg-white dark:bg-gray-800"
                  >
                    <div className="aspect-[4/3] rounded-lg overflow-hidden mb-2 relative">
                      <img src="/backgrounds/thumbs/bg8_thumb.webp" alt="Lila & Dunkel" className="w-full h-full object-cover" />
                      <div className="absolute top-1 right-1 w-3 h-3 rounded-full border border-white shadow-sm" style={{ backgroundColor: '#7b2ff2' }} />
                      <div className="absolute bottom-1 left-1 bg-gray-900/90 rounded px-1 py-0.5">
                        <Moon className="w-2.5 h-2.5 text-blue-400" />
                      </div>
                    </div>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Lila</span>
                  </button>

                  {/* Teal & Light Theme */}
                  <button
                    onClick={() => {
                      dispatch({ type: 'UPDATE_PREFERENCES', payload: { 
                        theme: 'light', 
                        accentColor: '#006d8f',
                        backgroundImage: '/backgrounds/bg11.jpg',
                        backgroundType: 'image'
                      }});
                      document.documentElement.classList.remove('dark');
                    }}
                    className="group relative p-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-teal-500 transition-all bg-white dark:bg-gray-800"
                  >
                    <div className="aspect-[4/3] rounded-lg overflow-hidden mb-2 relative">
                      <img src="/backgrounds/thumbs/bg11_thumb.webp" alt="Petrol & Hell" className="w-full h-full object-cover" />
                      <div className="absolute top-1 right-1 w-3 h-3 rounded-full border border-white shadow-sm" style={{ backgroundColor: '#006d8f' }} />
                      <div className="absolute bottom-1 left-1 bg-white/90 rounded px-1 py-0.5">
                        <Sun className="w-2.5 h-2.5 text-amber-500" />
                      </div>
                    </div>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Petrol</span>
                  </button>
                </div>
              </div>
              
              {/* Accent Colors - Full Palette */}
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                  {state.preferences.language === 'de' ? 'Akzentfarbe' : 'Accent Color'}
                </h4>
                
                {/* Light Mode Colors */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Light Mode</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['#e06610', '#9a244f', '#7b2ff2', '#006d8f', '#00a78e', '#00b92a', '#2f4f4f', '#7c2a00', '#c600ff'].map(color => (
                      <button
                        key={`light-${color}`}
                        onClick={() => dispatch({ type: 'UPDATE_PREFERENCES', payload: { accentColor: color }})}
                        className={`relative w-8 h-8 rounded-lg transition-all duration-200 hover:scale-110 ${
                          state.preferences.accentColor === color
                            ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800'
                            : 'hover:ring-1 hover:ring-gray-300'
                        }`}
                        style={{
                          backgroundColor: color,
                          boxShadow: state.preferences.accentColor === color ? `0 0 0 2px ${color}` : '0 1px 3px rgba(0,0,0,0.1)'
                        }}
                        title={color}
                      >
                        {state.preferences.accentColor === color && (
                          <Check className="w-4 h-4 text-white absolute inset-0 m-auto drop-shadow-md" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Dark Mode Colors */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Moon className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Dark Mode</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['#ff8a3d', '#ff6b9d', '#a78bfa', '#22d3ee', '#34d399', '#4ade80', '#60a5fa', '#fbbf24', '#f472b6'].map(color => (
                      <button
                        key={`dark-${color}`}
                        onClick={() => dispatch({ type: 'UPDATE_PREFERENCES', payload: { accentColor: color }})}
                        className={`relative w-8 h-8 rounded-lg transition-all duration-200 hover:scale-110 ${
                          state.preferences.accentColor === color
                            ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800'
                            : 'hover:ring-1 hover:ring-gray-300'
                        }`}
                        style={{
                          backgroundColor: color,
                          boxShadow: state.preferences.accentColor === color ? `0 0 0 2px ${color}` : '0 1px 3px rgba(0,0,0,0.1)'
                        }}
                        title={color}
                      >
                        {state.preferences.accentColor === color && (
                          <Check className="w-4 h-4 text-white absolute inset-0 m-auto drop-shadow-md" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Background Images - Full Gallery */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {state.preferences.language === 'de' ? 'Hintergrundbilder' : 'Background Images'}
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  {/* Light/Dark Theme Pairs - Collapsible Stack */}
                  <div className="col-span-3 mb-2">
                    {/* Collapsed state button */}
                    {!showThemePairs && (
                      <button
                        onClick={() => setShowThemePairs(true)}
                        className="w-full relative group cursor-pointer rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-300"
                      >
                        {/* Stacked Preview */}
                        <div className="relative h-14">
                          {/* Stack of images */}
                          <div className="absolute inset-0 flex">
                            <div className="flex-1 relative overflow-hidden">
                              <img src="/backgrounds/thumbs/bg12_thumb.webp" alt="" className="w-full h-full object-cover" />
                            </div>
                            <div className="w-px bg-gray-300 dark:bg-gray-600" />
                            <div className="flex-1 relative overflow-hidden">
                              <img src="/backgrounds/thumbs/bg13_thumb.webp" alt="" className="w-full h-full object-cover" />
                            </div>
                          </div>
                          {/* Stacked cards effect */}
                          <div className="absolute inset-x-1 -bottom-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-b-lg opacity-60" />
                          <div className="absolute inset-x-2 -bottom-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-b-lg opacity-40" />
                          {/* Overlay with label */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-end justify-center pb-2">
                            <div className="flex items-center gap-2 text-white">
                              <Sun className="w-3 h-3 text-amber-400" />
                              <span className="text-xs font-medium">/</span>
                              <Moon className="w-3 h-3 text-blue-400" />
                              <span className="text-xs font-medium ml-1">{t('settings_appearance.themePairs')}</span>
                              <ChevronDown className="w-3 h-3 ml-1" />
                            </div>
                          </div>
                          {/* Active pair indicator */}
                          {(state.preferences.backgroundImage?.match(/bg1[2-9]\.png|bg2[2-5]\.png/)) && (
                            <div className="absolute top-2 right-2">
                              <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: state.preferences.accentColor }} />
                            </div>
                          )}
                        </div>
                      </button>
                    )}
                    
                    {/* Expanded pairs */}
                    {showThemePairs && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                        {/* Theme Pair Cards */}
                        {[
                          { light: 'bg12.webp', dark: 'bg13.webp' },
                          { light: 'bg14.webp', dark: 'bg15.webp' },
                          { light: 'bg16.webp', dark: 'bg17.webp' },
                          { light: 'bg18.webp', dark: 'bg19.webp' },
                          { light: 'bg22.webp', dark: 'bg23.webp' },
                          { light: 'bg24.webp', dark: 'bg25.webp' },
                        ].map((pair) => {
                        const isSelected = state.preferences.backgroundImage?.includes(pair.light) || state.preferences.backgroundImage?.includes(pair.dark);
                        return (
                          <div
                            key={pair.light}
                            onClick={() => dispatch({ type: 'UPDATE_PREFERENCES', payload: { backgroundImage: `/backgrounds/${pair.light}`, backgroundType: 'image' }})}
                            className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200 hover:scale-[1.02] ${
                              isSelected
                                ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800'
                                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                            }`}
                            style={isSelected ? {
                              borderColor: state.preferences.accentColor,
                              boxShadow: `0 0 0 2px ${state.preferences.accentColor}20, 0 0 0 4px ${state.preferences.accentColor}`
                            } : {}}
                          >
                            <div className="flex h-12">
                              <div className="relative flex-1 overflow-hidden">
                                <img src={`/backgrounds/thumbs/${pair.light.replace('.webp', '_thumb.webp')}`} alt="Light" className="w-full h-full object-cover" />
                                <div className="absolute bottom-0.5 left-0.5 bg-white/90 rounded px-0.5 py-0.5">
                                  <Sun className="w-2 h-2 text-amber-500" />
                                </div>
                              </div>
                              <div className="w-px bg-gray-300 dark:bg-gray-600" />
                              <div className="relative flex-1 overflow-hidden">
                                <img src={`/backgrounds/thumbs/${pair.dark.replace('.webp', '_thumb.webp')}`} alt="Dark" className="w-full h-full object-cover" />
                                <div className="absolute bottom-0.5 right-0.5 bg-gray-900/90 rounded px-0.5 py-0.5">
                                  <Moon className="w-2 h-2 text-blue-400" />
                                </div>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: state.preferences.accentColor }}>
                                  <Check className="w-3 h-3 text-white" />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                        </div>
                        {/* Collapse button */}
                        <button
                          onClick={() => setShowThemePairs(false)}
                          className="w-full py-1.5 flex items-center justify-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50"
                        >
                          <ChevronUp className="w-3 h-3" />
                          <span>{state.preferences.language === 'de' ? 'Einklappen' : 'Collapse'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Regular Gallery Images (including bg20, bg21) */}
                  {['/backgrounds/bg20.webp', '/backgrounds/bg21.webp', '/backgrounds/bg1.jpg', '/backgrounds/bg2.jpg', '/backgrounds/bg3.jpg', '/backgrounds/bg4.jpg', '/backgrounds/bg5.jpg', '/backgrounds/bg6.webp', '/backgrounds/bg7.jpg', '/backgrounds/bg8.jpg', '/backgrounds/bg9.jpg', '/backgrounds/bg10.jpg', '/backgrounds/bg11.jpg'].map((imageUrl) => (
                    <div 
                      key={imageUrl}
                      className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                        state.preferences.backgroundImage === imageUrl
                          ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                      }`}
                      style={state.preferences.backgroundImage === imageUrl ? {
                        borderColor: state.preferences.accentColor,
                        boxShadow: `0 0 0 2px ${state.preferences.accentColor}20, 0 0 0 4px ${state.preferences.accentColor}`
                      } : {}}
                      onClick={() => dispatch({ type: 'UPDATE_PREFERENCES', payload: { backgroundImage: imageUrl, backgroundType: 'image' }})}
                    >
                      <img src={imageUrl} alt="Background" className="w-full h-16 object-cover" />
                      {state.preferences.backgroundImage === imageUrl && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: state.preferences.accentColor }}>
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

      

      {/* Main Content */}
      <div className="relative z-10 pl-20 pr-8 pt-12 pb-4">
        {/* Header Section */}
        <div className="text-center mb-12">
          {/* Date and Greeting Display */}
          <div className="mb-12 max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <MaterialIcon name="wb_sunny" size={20} style={{ color: state.preferences.accentColor }} />
                              <h1 className={`text-lg font-medium tracking-wide ${
                isMinimalDesign 
                  ? 'text-gray-700 dark:text-gray-300' 
                  : 'text-gray-300 dark:text-gray-400'
              }`} style={{ fontFamily: "'Roboto', sans-serif" }}>
                {format(new Date(), 'EEEE, d. MMMM', { locale: i18n.language === 'en' ? enUS : de })}
              </h1>
            </div>
            <div className="flex items-center justify-center space-x-4 mb-4">
              <img 
                src={getFuchsImagePath()} 
                alt="Fuchs Logo" 
                className="w-24 h-24 object-contain"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = getImagePath('Fuchs.svg'); }}
              />
              <p className={`text-4xl font-medium tracking-wide ${
                isMinimalDesign 
                  ? 'text-gray-800 dark:text-gray-100' 
                  : 'text-gray-300 dark:text-gray-200'
              }`} style={{ fontFamily: "'Roboto', sans-serif" }}>
                {t('today.greeting')}
              </p>
            </div>
          </div>

          {/* Search Box */}
          <div className="max-w-2xl mx-auto mb-12 relative transition-all duration-300 focus-within:scale-105 z-[10000]">
            <div className="relative">
              <MaterialIcon 
                name="search" 
                className="absolute left-5 top-1/2 transform -translate-y-1/2 z-10" 
                size={24} 
                style={{ color: state.preferences.accentColor }} 
              />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchQueryChange}
                onKeyPress={handleKeyPress}
                onFocus={(e) => {
                  searchQuery.trim() && setShowSearchResults(true);
                  e.currentTarget.style.transform = 'scale(1.05) translateZ(0)';
                  e.currentTarget.style.boxShadow = `0 12px 40px ${state.preferences.accentColor}20, 0 8px 20px rgba(0, 0, 0, 0.15)`;
                }}
                onBlur={(e) => {
                  setTimeout(() => setShowSearchResults(false), 200);
                  e.currentTarget.style.transform = 'scale(1) translateZ(0)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15), 0 4px 10px rgba(0, 0, 0, 0.1)';
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02) translateZ(0)';
                }}
                onMouseLeave={(e) => {
                  if (document.activeElement !== e.currentTarget) {
                    e.currentTarget.style.transform = 'scale(1) translateZ(0)';
                  }
                }}
                placeholder={simpleTodayView.searchPlaceholder()}
                className="w-full pl-14 pr-6 py-5 border-0 rounded-full text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none transition-all duration-300 bg-white/85 dark:bg-gray-800/85 backdrop-blur-md hover:shadow-xl focus:shadow-2xl"
                style={{
                  boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15), 0 4px 10px rgba(0, 0, 0, 0.1)',
                  transform: 'translateZ(0)',
                }}
              />
            </div>
            
            {/* Live Search Results */}
            {showSearchResults && (searchResults.tasks.length > 0 || searchResults.notes.length > 0) && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-[10001] max-h-96 overflow-y-auto backdrop-blur-xl">
                {/* Tasks Results */}
                {searchResults.tasks.length > 0 && (
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{header.searchResults.tasks(searchResults.tasks.length)}</h4>
                    <div className="space-y-2">
                      {searchResults.tasks.map(task => (
                        <div
                          key={task.id}
                          onClick={() => handleSearchResultClick('task', task)}
                          className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                        >
                          <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{task.title}</p>
                            {task.description && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{task.description}</p>
                            )}
                          </div>
                          {task.tags.length > 0 && (
                            <div className="flex space-x-1 flex-shrink-0">
                              {task.tags.slice(0, 2).map(tag => (
                                <span key={tag} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-600 rounded-full text-gray-600 dark:text-gray-400">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes Results */}
                {searchResults.notes.length > 0 && (
                  <div className="p-4">
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{header.searchResults.notes(searchResults.notes.length)}</h4>
                    <div className="space-y-2">
                      {searchResults.notes.map(note => (
                        <div
                          key={note.id}
                          onClick={() => handleSearchResultClick('note', note)}
                          className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                        >
                          <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{note.title || (i18n.language === 'en' ? 'Untitled Note' : 'Unbenannte Notiz')}</p>
                            {note.content && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{note.content.substring(0, 100)}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Pull to refresh for mobile */}
        <MobilePullToRefresh onRefresh={async () => dispatch({ type: 'NO_OP' } as any)}>
        {/* Today Tasks - Single Column Layout */}
        <div className="max-w-2xl mx-auto">

          {/* Today Tasks Widget */}
          <StandardWidget
            icon="today"
            title={t('dashboard.todays_tasks')}
            accentColor={state.preferences.accentColor}
            isMinimalDesign={isMinimalDesign}
            headerAction={
              <button
                onClick={handleCreateNewTask}
                className="p-2 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                style={{
                  background: `${state.preferences.accentColor}15`,
                  color: state.preferences.accentColor
                }}
                title={i18n.language === 'en' ? 'Add task' : 'Aufgabe hinzufügen'}
              >
                <Plus className="w-5 h-5" />
              </button>
            }
            footerAction={state.preferences.enableEndOfDay && (
              <button
                onClick={() => setShowEndOfDayModal(true)}
                data-end-day-button
                className="group flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                style={{
                  background: `linear-gradient(135deg, ${state.preferences.accentColor}, ${state.preferences.accentColor}dd)`,
                  color: 'white',
                  boxShadow: `0 2px 8px ${state.preferences.accentColor}40`
                }}
                title={simpleTodayView.endDay()}
              >
                <span className="text-base">🌙</span>
                <span>
                  {i18n.language === 'en' ? 'End Day' : 'Tagesabschluss'}
                </span>
                <MaterialIcon 
                  name="chevron_right" 
                  size={16} 
                  className="opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" 
                />
              </button>
            )}
          >
              {todayTasks.length === 0 ? (
              <EmptyState
                title={i18n.language === 'en' ? "All clear" : "Alles entspannt"}
                subtitle={i18n.language === 'en' ? "No tasks planned for today" : "Keine Aufgaben für heute geplant"}
                isMinimalDesign={isMinimalDesign}
              />
              ) : (
              <>
                {/* Task count and total time */}
                <div className={`flex items-center justify-between mb-3 pb-2 border-b ${isMinimalDesign ? 'border-gray-200 dark:border-gray-700' : 'border-white/20'}`}>
                  <div className={`text-sm ${isMinimalDesign ? 'text-gray-600 dark:text-gray-400' : 'text-white/80'}`} 
                       style={{ fontFamily: "'Roboto', sans-serif" }}>
                    {todayTasks.length} {i18n.language === 'en' 
                      ? (todayTasks.length === 1 ? 'task' : 'tasks')
                      : (todayTasks.length === 1 ? 'Aufgabe' : 'Aufgaben')
                    }
                  </div>
                  {totalEstimatedTime > 0 && (
                    <div className={`text-sm font-medium ${isMinimalDesign ? 'text-gray-700 dark:text-gray-300' : 'text-white'}`}
                         style={{ fontFamily: "'Roboto', sans-serif" }}>
                      {formatTime(totalEstimatedTime)}
                    </div>
                  )}
                </div>

                <SortableContext
                  items={todayTasks.map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-1">
                    {todayTasks.map((task, index) => (
                      <SwipeableTaskCard
                        key={task.id}
                        onSwipeLeft={() => {
                          setLastArchivedTaskId(task.id);
                          dispatch({ type: 'UPDATE_TASK', payload: { ...task, columnId: 'archive' } });
                          setSnackbarOpen(true);
                        }}
                        onSwipeRight={() => handleTaskClick(task.id)}
                      >
                        <TaskCard
                          task={task}
                          isFirst={index === 0}
                          isLast={index === todayTasks.length - 1}
                        />
                      </SwipeableTaskCard>
                    ))}
                  </div>
                </SortableContext>
              </>
              )}
          </StandardWidget>

        </div>
        </MobilePullToRefresh>
      </div>



      {/* Task Modal */}
      {showTaskModal && selectedTaskId && (() => {
        const selectedTask = state.tasks.find(task => task.id === selectedTaskId);
        return selectedTask ? createPortal(
          <TaskModal
            task={selectedTask}
            isOpen={showTaskModal}
            onClose={handleCloseTaskModal}
          />,
          document.body
        ) : null;
      })()}

      {/* Note Modal */}
      {showNoteModal && selectedNote && (
        <div 
          className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={handleModalBackdropClick}
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-6xl h-[95vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                          <div className="flex items-center space-x-3">
              <FileText className="w-5 h-5" style={getAccentColorStyles().text} />
                {isEditingNote ? (
                  <input
                    type="text"
                    value={editedNoteTitle}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="text-xl font-semibold bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400"
                    placeholder={i18n.language === 'en' ? 'Note title...' : 'Titel der Notiz...'}
                  />
                ) : (
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {selectedNote.title || (i18n.language === 'en' ? 'Untitled Note' : 'Unbenannte Notiz')}
                  </h2>
                )}
                {selectedNote.pinned && (
                  <Star className="w-4 h-4" style={getAccentColorStyles().text} />
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                {/* Preview/Edit Toggle */}
                <div className="flex bg-gray-200 dark:bg-gray-600 rounded-lg p-1">
                  <button
                    onClick={() => setIsEditingNote(false)}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      !isEditingNote 
                        ? 'text-white shadow-sm' 
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
                    }`}
                    style={!isEditingNote ? getAccentColorStyles().bg : undefined}
                  >
                    Vorschau
                  </button>
                  <button
                    onClick={() => setIsEditingNote(true)}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      isEditingNote 
                        ? 'text-white shadow-sm' 
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
                    }`}
                    style={isEditingNote ? getAccentColorStyles().bg : undefined}
                  >
                    Bearbeiten
                  </button>
                </div>
                
                {/* Link to Notes */}
                <button
                  onClick={() => {
                    handleCloseNoteModal();
                    dispatch({ type: 'SELECT_NOTE', payload: selectedNote });
                    onNavigate?.('notes');
                  }}
                  className="px-3 py-1.5 text-white rounded-lg transition-colors text-sm flex items-center space-x-2"
                  style={getAccentColorStyles().bg}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = getAccentColorStyles().bgHover.backgroundColor;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = getAccentColorStyles().bg.backgroundColor;
                  }}
                                      title={simpleTodayView.openInNotes()}
                >
                  <ExternalLink className="w-4 h-4" />
                                      <span>{simpleTodayView.openInNotes()}</span>
                </button>
                
                <button
                  onClick={handleCloseNoteModal}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-hidden">
              {isEditingNote ? (
                <div className="h-full flex flex-col">
                  {/* WYSIWYG Toolbar */}
                  <div className="flex items-center space-x-1 p-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 rounded-lg">
                    <button
                      onClick={() => insertHeading(1)}
                      className="p-2 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-blue-500"
                      title={simpleTodayView.toolbar.heading1()}
                    >
                      <Heading1 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => insertHeading(2)}
                      className="p-2 rounded transition-colors"
                      style={getAccentColorStyles().text}
                      onMouseEnter={(e) => {
                        const isDark = document.documentElement.classList.contains('dark');
                        e.currentTarget.style.backgroundColor = isDark 
                          ? state.preferences.accentColor + '20' 
                          : state.preferences.accentColor + '10';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      title={simpleTodayView.toolbar.heading2()}
                    >
                      <Heading2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => insertHeading(3)}
                      className="p-2 rounded transition-colors"
                      style={getAccentColorStyles().text}
                      onMouseEnter={(e) => {
                        const isDark = document.documentElement.classList.contains('dark');
                        e.currentTarget.style.backgroundColor = isDark 
                          ? state.preferences.accentColor + '20' 
                          : state.preferences.accentColor + '10';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      title={simpleTodayView.toolbar.heading3()}
                    >
                      <Heading3 className="w-4 h-4" />
                    </button>
                    
                    <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>
                    
                    <button
                      onClick={() => insertMarkdown('**', '**')}
                      className="p-2 rounded transition-colors"
                      style={getAccentColorStyles().text}
                      onMouseEnter={(e) => {
                        const isDark = document.documentElement.classList.contains('dark');
                        e.currentTarget.style.backgroundColor = isDark 
                          ? state.preferences.accentColor + '20' 
                          : state.preferences.accentColor + '10';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      title={simpleTodayView.toolbar.bold()}
                    >
                      <Bold className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => insertMarkdown('*', '*')}
                      className="p-2 rounded transition-colors"
                      style={getAccentColorStyles().text}
                      onMouseEnter={(e) => {
                        const isDark = document.documentElement.classList.contains('dark');
                        e.currentTarget.style.backgroundColor = isDark 
                          ? state.preferences.accentColor + '20' 
                          : state.preferences.accentColor + '10';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      title={simpleTodayView.toolbar.italic()}
                    >
                      <Italic className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => insertMarkdown('`', '`')}
                      className="p-2 rounded transition-colors"
                      style={getAccentColorStyles().text}
                      onMouseEnter={(e) => {
                        const isDark = document.documentElement.classList.contains('dark');
                        e.currentTarget.style.backgroundColor = isDark 
                          ? state.preferences.accentColor + '20' 
                          : state.preferences.accentColor + '10';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      title="Code"
                    >
                      <Code className="w-4 h-4" />
                    </button>
                    
                    <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>
                    
                    <button
                      onClick={() => insertList(false)}
                      className="p-2 rounded transition-colors"
                      style={getAccentColorStyles().text}
                      onMouseEnter={(e) => {
                        const isDark = document.documentElement.classList.contains('dark');
                        e.currentTarget.style.backgroundColor = isDark 
                          ? state.preferences.accentColor + '20' 
                          : state.preferences.accentColor + '10';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      title={simpleTodayView.toolbar.list()}
                    >
                      <List className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => insertList(true)}
                      className="p-2 rounded transition-colors"
                      style={getAccentColorStyles().text}
                      onMouseEnter={(e) => {
                        const isDark = document.documentElement.classList.contains('dark');
                        e.currentTarget.style.backgroundColor = isDark 
                          ? state.preferences.accentColor + '20' 
                          : state.preferences.accentColor + '10';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      title={simpleTodayView.toolbar.numberedList()}
                    >
                      <ListOrdered className="w-4 h-4" />
                    </button>
                    <button
                      onClick={insertCheckbox}
                      className="p-2 rounded transition-colors"
                      style={getAccentColorStyles().text}
                      onMouseEnter={(e) => {
                        const isDark = document.documentElement.classList.contains('dark');
                        e.currentTarget.style.backgroundColor = isDark 
                          ? state.preferences.accentColor + '20' 
                          : state.preferences.accentColor + '10';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      title={simpleTodayView.toolbar.checkbox()}
                    >
                      <CheckSquare className="w-4 h-4" />
                    </button>
                    
                    <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>
                    
                    <button
                      onClick={insertLink}
                      className="p-2 rounded transition-colors"
                      style={getAccentColorStyles().text}
                      onMouseEnter={(e) => {
                        const isDark = document.documentElement.classList.contains('dark');
                        e.currentTarget.style.backgroundColor = isDark 
                          ? state.preferences.accentColor + '20' 
                          : state.preferences.accentColor + '10';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      title={simpleTodayView.toolbar.insertLink()}
                    >
                      <LinkIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={insertHorizontalRule}
                      className="p-2 rounded transition-colors"
                      style={getAccentColorStyles().text}
                      onMouseEnter={(e) => {
                        const isDark = document.documentElement.classList.contains('dark');
                        e.currentTarget.style.backgroundColor = isDark 
                          ? state.preferences.accentColor + '20' 
                          : state.preferences.accentColor + '10';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      title="Horizontale Linie"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    
                    <div className="flex-1"></div>
                    
                    <button
                      onClick={() => alert(simpleTodayView.markdownHelpText())}
                      className="p-2 rounded transition-colors"
                      style={getAccentColorStyles().text}
                      onMouseEnter={(e) => {
                        const isDark = document.documentElement.classList.contains('dark');
                        e.currentTarget.style.backgroundColor = isDark 
                          ? state.preferences.accentColor + '20' 
                          : state.preferences.accentColor + '10';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      title={simpleTodayView.toolbar.markdownHelp()}
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Editor */}
                  <textarea
                    id="note-textarea"
                    value={editedNoteContent}
                    onChange={(e) => handleContentChange(e.target.value)}
                    onKeyDown={handleTextareaKeyDown}
                    className="flex-1 p-4 resize-none border-none outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 font-mono text-sm leading-relaxed"
                    placeholder="Beginne mit dem Schreiben..."
                  />
                </div>
              ) : (
                <div 
                  className="p-6 overflow-y-auto h-full cursor-text"
                  onClick={handleContentClick}
                  title="Klicken zum Bearbeiten"
                >
                  {renderMarkdown(editedNoteContent)}
                </div>
              )}
            </div>

            {/* Tags */}
            {selectedNote.tags && selectedNote.tags.length > 0 && (
              <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-wrap gap-2">
                  {selectedNote.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {t('forms.created_label')}: {format(new Date(selectedNote.createdAt), 'dd.MM.yyyy HH:mm', { locale: i18n.language === 'en' ? enUS : de })}
                {hasUnsavedChanges && <span className="ml-2" style={getAccentColorStyles().text}>• Automatisches Speichern...</span>}
              </div>
              <div className="flex space-x-3">
                {hasUnsavedChanges && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSaveNote();
                    }}
                    className="px-4 py-2 text-white rounded-lg transition-colors"
                    style={getAccentColorStyles().bg}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = getAccentColorStyles().bgHover.backgroundColor;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = getAccentColorStyles().bg.backgroundColor;
                    }}
                  >
                    Speichern
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Task Modal */}
      {selectedTaskId && (
        <TaskModal
          task={state.tasks.find(t => t.id === selectedTaskId) || null}
          isOpen={showTaskModal}
          onClose={handleCloseTaskModal}
        />
      )}

      {/* Smart Task Modal - Tasks added here are dated for today */}
      <SmartTaskModal
        isOpen={showSmartTaskModal}
        onClose={handleCloseSmartTaskModal}
        placeholder={forms.placeholderSmartTask()}
        defaultDate={format(new Date(), 'yyyy-MM-dd')}
      />

      {/* Undo snackbar */}
      <MobileSnackbar
        open={snackbarOpen}
        message={t('actions.archived', { defaultValue: 'Archiviert' })}
        onAction={() => {
          if (!lastArchivedTaskId) return;
          const tsk = state.tasks.find(t => t.id === lastArchivedTaskId);
          if (tsk) {
            dispatch({ type: 'UPDATE_TASK', payload: { ...tsk, columnId: 'today' } });
          }
          setSnackbarOpen(false);
        }}
        onClose={() => setSnackbarOpen(false)}
      />

      {/* End-of-Day Modal */}
      <EndOfDayModal 
        isOpen={showEndOfDayModal}
        onClose={() => setShowEndOfDayModal(false)}
      />

      {/* Reminder Modal */}
      {showReminderModal && selectedItemForReminder && (
        <ReminderModal
          isOpen={showReminderModal}
          onClose={() => {
            setShowReminderModal(false);
            setSelectedItemForReminder(null);
          }}
          item={selectedItemForReminder}
          onSave={handleSaveReminder}
          accentColor={state.preferences.accentColor}
        />
      )}
      
      {/* Checklist Reminder Modal */}
      {showChecklistReminderModal && currentReminderItem && (
        <ChecklistReminderModal
          isOpen={showChecklistReminderModal}
          onClose={() => {
            setShowChecklistReminderModal(false);
            setCurrentReminderItem(null);
          }}
          item={currentReminderItem}
          accentColor={state.preferences.accentColor}
          onComplete={handleCompleteChecklistItem}
        />
      )}

      {/* Context Menu */}
      {contextMenu && (() => {
        const item = checklistItems.find(item => item.id === contextMenu.itemId);
        if (!item) return null;

        const menuItems = contextMenu.type === 'active' 
          ? [
              {
                icon: <Bell className="w-4 h-4" />,
                label: item.reminderDate ? 'Erinnerung bearbeiten' : 'Erinnerung hinzufügen',
                action: () => {
                  setCurrentReminderItem(item);
                  setShowChecklistReminderModal(true);
                  setContextMenu(null);
                }
              },
                             {
                 icon: <Edit className="w-4 h-4" />,
                 label: 'Bearbeiten',
                 action: () => {
                   handleStartEdit(item);
                   setContextMenu(null);
                 }
               },
              {
                icon: <CheckCircle2 className="w-4 h-4" />,
                label: 'Als erledigt markieren',
                action: () => {
                  const updatedItems = checklistItems.map(i =>
                    i.id === item.id ? { ...i, completed: true } : i
                  );
                  setChecklistItems(updatedItems);
                  localStorage.setItem('checklistItems', JSON.stringify(updatedItems));
                  setContextMenu(null);
                }
              },
              {
                icon: <Trash2 className="w-4 h-4" />,
                label: 'Löschen',
                action: () => {
                  handleDeleteItem(item.id);
                  setContextMenu(null);
                },
                danger: true
              }
            ]
          : [
              {
                icon: <Circle className="w-4 h-4" />,
                label: 'Als offen markieren',
                action: () => {
                  const updatedItems = checklistItems.map(i =>
                    i.id === item.id ? { ...i, completed: false } : i
                  );
                  setChecklistItems(updatedItems);
                  localStorage.setItem('checklistItems', JSON.stringify(updatedItems));
                  setContextMenu(null);
                }
              },
              {
                icon: <Trash2 className="w-4 h-4" />,
                label: 'Löschen',
                action: () => {
                  handleDeleteItem(item.id);
                  setContextMenu(null);
                },
                danger: true
              }
            ];

        return createPortal(
          <div
            className="fixed z-[999999] py-2 min-w-[200px] backdrop-blur-xl border shadow-lg rounded-lg"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
              background: isMinimalDesign 
                ? 'rgba(255, 255, 255, 0.95)'
                : 'rgba(255, 255, 255, 0.15)',
              borderColor: isMinimalDesign 
                ? 'rgba(0, 0, 0, 0.1)'
                : 'rgba(255, 255, 255, 0.2)'
            }}
          >
            {menuItems.map((menuItem, index) => (
              <button
                key={index}
                onClick={menuItem.action}
                className={`w-full flex items-center space-x-3 px-4 py-2 text-sm transition-colors ${
                  isMinimalDesign
                    ? `text-gray-700 hover:bg-gray-100 ${menuItem.danger ? 'hover:text-red-600' : ''}`
                    : `text-white hover:bg-white/10 ${menuItem.danger ? 'hover:text-red-400' : ''}`
                }`}
              >
                <span className={menuItem.danger 
                  ? (isMinimalDesign ? 'text-red-500' : 'text-red-400') 
                  : (isMinimalDesign ? 'text-gray-500' : 'text-white/70')
                }>
                  {menuItem.icon}
                </span>
                <span>{menuItem.label}</span>
              </button>
            ))}
          </div>,
          document.body
        );
      })()}
    </div>
    </DndContext>
  );
}

// Reminder Modal Component
interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ChecklistItem;
  onSave: (date: string, time: string) => void;
  accentColor: string;
}

function ReminderModal({ isOpen, onClose, item, onSave, accentColor }: ReminderModalProps) {
  const [reminderDate, setReminderDate] = useState(item.reminderDate || new Date().toISOString().split('T')[0]);
  const [reminderTime, setReminderTime] = useState(item.reminderTime || '09:00');

  const handleSave = () => {
    onSave(reminderDate, reminderTime);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: accentColor + '20' }}
              >
                <Bell className="w-5 h-5" style={{ color: accentColor }} />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Erinnerung setzen
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Für: "{item.text}"
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Date Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center space-x-2">
              <Calendar className="w-4 h-4" style={{ color: accentColor }} />
              <span>Datum</span>
            </label>
            <input
              type="date"
              value={reminderDate}
              onChange={(e) => setReminderDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent text-gray-900 dark:text-gray-100 transition-all duration-200"
              style={{ 
                '--tw-ring-color': accentColor + '40',
                borderColor: accentColor + '30'
              } as React.CSSProperties}
            />
          </div>

          {/* Time Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center space-x-2">
              <Clock className="w-4 h-4" style={{ color: accentColor }} />
              <span>Uhrzeit</span>
            </label>
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent text-gray-900 dark:text-gray-100 transition-all duration-200"
              style={{ 
                '--tw-ring-color': accentColor + '40',
                borderColor: accentColor + '30'
              } as React.CSSProperties}
            />
          </div>

          {/* Preview */}
          <div 
            className="p-4 rounded-xl border"
            style={{ 
              backgroundColor: accentColor + '10',
              borderColor: accentColor + '30'
            }}
          >
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4" style={{ color: accentColor }} />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Erinnerung wird ausgelöst:
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {reminderDate === new Date().toISOString().split('T')[0] ? 'Heute' : 
               format(new Date(reminderDate), 'dd.MM.yyyy', { locale: de })} um {reminderTime} Uhr
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 text-white rounded-xl font-medium transition-all duration-200 hover:scale-105 transform"
            style={{ backgroundColor: accentColor }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = accentColor + 'dd';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = accentColor;
            }}
          >
            Erinnerung setzen
          </button>
        </div>
      </div>
    </div>
  );
}
