import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  X, 
  ChevronDown, 
  ChevronUp,
  Pin,
  Check,
  SlidersHorizontal,
  RotateCcw
} from 'lucide-react';

export type DateFilterOption = 'all' | 'anytime' | 'today' | 'tomorrow' | 'thisWeek' | 'overdue';
export type PriorityOption = 'high' | 'medium' | 'low' | 'none';

interface TagItem {
  id: string;
  name: string;
  color?: string;
  count: number;
}

interface CompactFilterBarProps {
  // Filter state
  priorityFilter: PriorityOption | 'all';
  dateFilter: DateFilterOption;
  tagFilters: string[];
  showCompleted: boolean;
  
  // Available options
  availableTags: TagItem[];
  
  // Callbacks
  onPriorityChange: (priority: PriorityOption | 'all') => void;
  onDateFilterChange: (filter: DateFilterOption) => void;
  onTagToggle: (tagName: string) => void;
  onShowCompletedToggle: () => void;
  onClearAll: () => void;
  
  // Appearance
  accentColor: string;
  isDarkMode: boolean;
  isMinimalDesign: boolean;
  
  // Pin functionality
  isPinned: boolean;
  onPinnedChange: (pinned: boolean) => void;
  
  // Optional: visibility control from parent
  isVisible?: boolean;
  onClose?: () => void;
  
  // Optional: hide date filters (for Planner)
  hideDateFilters?: boolean;
}

export function CompactFilterBar({
  priorityFilter,
  dateFilter,
  tagFilters,
  showCompleted,
  availableTags,
  onPriorityChange,
  onDateFilterChange,
  onTagToggle,
  onShowCompletedToggle,
  onClearAll,
  accentColor,
  isDarkMode,
  isMinimalDesign,
  isPinned,
  onPinnedChange,
  isVisible = true,
  onClose,
  hideDateFilters = false
}: CompactFilterBarProps) {
  const { t } = useTranslation();
  const [showAllTags, setShowAllTags] = useState(false);
  
  // Calculate active filter count
  const activeFilterCount = 
    (priorityFilter !== 'all' ? 1 : 0) + 
    (dateFilter !== 'all' ? 1 : 0) + 
    tagFilters.length + 
    (showCompleted ? 1 : 0);
  
  const hasActiveFilters = activeFilterCount > 0;
  
  // Priority options with colors
  const priorities: { key: PriorityOption; label: string; color: string }[] = [
    { key: 'high', label: t('tasks.priority.high', 'Hoch'), color: '#ef4444' },
    { key: 'medium', label: t('tasks.priority.medium', 'Mittel'), color: '#f59e0b' },
    { key: 'low', label: t('tasks.priority.low', 'Niedrig'), color: '#10b981' },
    { key: 'none', label: t('tasks.priority.none', 'Keine'), color: '#9ca3af' }
  ];
  
  // Date filter options - text only, no icons
  const dateOptions: { key: DateFilterOption; label: string; tooltip: string }[] = [
    { key: 'overdue', label: t('filter.overdue', 'Vergangen'), tooltip: t('filter.overdueTooltip', 'Überfällige Aufgaben') },
    { key: 'today', label: t('filter.today', 'Heute'), tooltip: t('filter.todayTooltip', 'Heutige Aufgaben') },
    { key: 'tomorrow', label: t('filter.tomorrow', 'Morgen'), tooltip: t('filter.tomorrowTooltip', 'Morgige Aufgaben') },
    { key: 'thisWeek', label: t('filter.thisWeek', 'Diese Woche'), tooltip: t('filter.thisWeekTooltip', 'Aufgaben dieser Woche') },
    { key: 'anytime', label: t('filter.anytime', 'Jederzeit'), tooltip: t('filter.anytimeTooltip', 'Aufgaben ohne Datum') }
  ];

  // Toggle priority - click again to deactivate
  const handlePriorityClick = (key: PriorityOption) => {
    if (priorityFilter === key) {
      onPriorityChange('all'); // Deactivate
    } else {
      onPriorityChange(key); // Activate
    }
  };

  // Toggle date filter - click again to deactivate
  const handleDateFilterClick = (key: DateFilterOption) => {
    if (dateFilter === key) {
      onDateFilterChange('all'); // Deactivate
    } else {
      onDateFilterChange(key); // Activate
    }
  };

  if (!isVisible) return null;

  const baseClasses = isMinimalDesign
    ? 'bg-gray-50/95 dark:bg-gray-800/95 border-gray-200 dark:border-gray-700'
    : isDarkMode 
      ? 'bg-gray-900/95 border-gray-700/50' 
      : 'bg-white/95 border-gray-200/80';

  // How many tags to show inline (first row)
  const inlineTagCount = 4;
  const inlineTags = availableTags.slice(0, inlineTagCount);
  const hasMoreTags = availableTags.length > inlineTagCount;

  return (
    <div 
      className={`
        backdrop-blur-xl rounded-xl border shadow-lg
        transition-all duration-300 ease-out
        ${baseClasses}
      `}
      style={{
        boxShadow: isDarkMode 
          ? '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)' 
          : '0 4px 24px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.02)'
      }}
    >
      {/* Main Filter Bar */}
      <div className="px-4 py-3">
        {/* Row 1: Header with active count, clear button, and controls */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {/* Filter Icon & Label */}
            <div 
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
              style={{ 
                backgroundColor: `${accentColor}15`,
                color: accentColor 
              }}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="text-sm font-semibold">Filter</span>
            </div>
            
            {/* Active Filter Count with Clear Button */}
            {hasActiveFilters && (
              <button
                onClick={onClearAll}
                className={`
                  flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                  transition-all duration-200 group
                  ${isDarkMode 
                    ? 'bg-gray-700/60 hover:bg-red-500/20 text-gray-300 hover:text-red-400' 
                    : 'bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-500'
                  }
                `}
                title={t('filter.clearAllTooltip', 'Alle Filter zurücksetzen')}
              >
                <span 
                  className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  {activeFilterCount}
                </span>
                <RotateCcw className="w-3.5 h-3.5 group-hover:rotate-[-45deg] transition-transform" />
                <span className="text-xs font-medium hidden sm:inline">
                  {t('filter.reset', 'Zurücksetzen')}
                </span>
              </button>
            )}
          </div>
          
          {/* Right Controls: Pin & Close */}
          <div className="flex items-center gap-1">
            {/* Pin Button */}
            <button
              onClick={() => onPinnedChange(!isPinned)}
              className={`
                p-2 rounded-lg transition-all duration-200
                ${isPinned 
                  ? 'text-white' 
                  : isDarkMode 
                    ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }
              `}
              style={isPinned ? { 
                backgroundColor: accentColor,
                boxShadow: `0 2px 8px ${accentColor}40`
              } : {}}
              title={isPinned ? t('filter.unpinTooltip', 'Filter nicht mehr dauerhaft anzeigen') : t('filter.pinTooltip', 'Filter dauerhaft anzeigen')}
            >
              <Pin className={`w-4 h-4 ${isPinned ? 'fill-current' : ''}`} />
            </button>
            
            {/* Close Button (only if not pinned) */}
            {!isPinned && onClose && (
              <button
                onClick={onClose}
                className={`
                  p-2 rounded-lg transition-all duration-200
                  ${isDarkMode 
                    ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }
                `}
                title={t('filter.closeTooltip', 'Filterleiste schließen')}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        
        {/* Row 2: Priority Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className={`text-xs font-medium mr-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {t('filter.priority', 'Priorität')}:
          </span>
          {priorities.map(({ key, label, color }) => {
            const isActive = priorityFilter === key;
            return (
              <button
                key={key}
                onClick={() => handlePriorityClick(key)}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-semibold
                  transition-all duration-200
                  ${isActive 
                    ? 'text-white shadow-md scale-[1.02]' 
                    : isDarkMode 
                      ? 'bg-gray-700/60 text-gray-300 hover:bg-gray-600/60 hover:scale-[1.02]' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-[1.02]'
                  }
                `}
                style={isActive ? { 
                  backgroundColor: color,
                  boxShadow: `0 2px 8px ${color}50`
                } : {}}
                title={isActive 
                  ? t('filter.clickToDeactivate', 'Klicken zum Deaktivieren') 
                  : t('filter.clickToActivate', 'Klicken zum Aktivieren')
                }
              >
                {label}
              </button>
            );
          })}
        </div>
        
        {/* Row 3: Date Filters (if not hidden) */}
        {!hideDateFilters && (
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className={`text-xs font-medium mr-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {t('filter.timeframe', 'Zeitraum')}:
            </span>
            {dateOptions.map(({ key, label, tooltip }) => {
              const isActive = dateFilter === key;
              return (
                <button
                  key={key}
                  onClick={() => handleDateFilterClick(key)}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-semibold
                    transition-all duration-200
                    ${isActive 
                      ? 'text-white shadow-md scale-[1.02]' 
                      : isDarkMode 
                        ? 'bg-gray-700/60 text-gray-300 hover:bg-gray-600/60 hover:scale-[1.02]' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-[1.02]'
                    }
                  `}
                  style={isActive ? { 
                    backgroundColor: accentColor,
                    boxShadow: `0 2px 8px ${accentColor}50`
                  } : {}}
                  title={isActive 
                    ? t('filter.clickToDeactivate', 'Klicken zum Deaktivieren') 
                    : tooltip
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
        
        {/* Row 4: Tags + Show Completed */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs font-medium mr-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {t('filter.tags', 'Tags')}:
          </span>
          
          {/* Inline Tags (first few) */}
          {inlineTags.map((tag) => {
            const isActive = tagFilters.includes(tag.name);
            return (
              <button
                key={tag.id}
                onClick={() => onTagToggle(tag.name)}
                className={`
                  px-2.5 py-1.5 rounded-lg text-xs font-medium
                  transition-all duration-200 flex items-center gap-1.5
                  ${isActive 
                    ? 'text-white shadow-md scale-[1.02]' 
                    : isDarkMode 
                      ? 'bg-gray-700/60 text-gray-300 hover:bg-gray-600/60 hover:scale-[1.02]' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-[1.02]'
                  }
                `}
                style={isActive ? { 
                  backgroundColor: tag.color || accentColor,
                  boxShadow: `0 2px 8px ${tag.color || accentColor}50`
                } : {}}
                title={isActive 
                  ? t('filter.clickToDeactivate', 'Klicken zum Deaktivieren') 
                  : `${tag.name} (${tag.count} ${t('filter.tasks', 'Aufgaben')})`
                }
              >
                <span 
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.5)' : (tag.color || accentColor) }}
                />
                {tag.name}
              </button>
            );
          })}
          
          {/* "Show More Tags" Button */}
          {hasMoreTags && (
            <button
              onClick={() => setShowAllTags(!showAllTags)}
              className={`
                px-2.5 py-1.5 rounded-lg text-xs font-medium
                transition-all duration-200 flex items-center gap-1
                ${isDarkMode 
                  ? 'bg-gray-700/40 text-gray-400 hover:bg-gray-600/60 hover:text-gray-300' 
                  : 'bg-gray-100/60 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                }
              `}
              title={showAllTags 
                ? t('filter.hideMoreTags', 'Weniger Tags anzeigen') 
                : t('filter.showMoreTags', 'Alle Tags anzeigen')
              }
            >
              +{availableTags.length - inlineTagCount}
              {showAllTags ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
          
          {/* No Tags Message */}
          {availableTags.length === 0 && (
            <span className={`text-xs italic ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              {t('filter.noTags', 'Keine Tags vorhanden')}
            </span>
          )}
          
          {/* Divider */}
          <div className={`w-px h-5 mx-1 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`} />
          
          {/* Show Completed Toggle */}
          <button
            onClick={onShowCompletedToggle}
            className={`
              px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5
              transition-all duration-200
              ${showCompleted 
                ? 'bg-green-500 text-white shadow-md scale-[1.02]' 
                : isDarkMode 
                  ? 'bg-gray-700/60 text-gray-300 hover:bg-gray-600/60 hover:scale-[1.02]' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-[1.02]'
              }
            `}
            style={showCompleted ? { boxShadow: '0 2px 8px rgba(34, 197, 94, 0.5)' } : {}}
            title={showCompleted 
              ? t('filter.hideCompletedTooltip', 'Erledigte Aufgaben ausblenden') 
              : t('filter.showCompletedTooltip', 'Erledigte Aufgaben anzeigen')
            }
          >
            <Check className="w-3.5 h-3.5" />
            {t('filter.showCompleted', 'Erledigte')}
          </button>
        </div>
      </div>
      
      {/* Expanded Tags Section (when "show more" is clicked) */}
      {showAllTags && availableTags.length > inlineTagCount && (
        <div 
          className={`
            px-4 pb-3 pt-0 border-t
            ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200/80'}
          `}
        >
          <div className="flex flex-wrap gap-2 pt-3">
            {availableTags.slice(inlineTagCount).map((tag) => {
              const isActive = tagFilters.includes(tag.name);
              return (
                <button
                  key={tag.id}
                  onClick={() => onTagToggle(tag.name)}
                  className={`
                    px-2.5 py-1.5 rounded-lg text-xs font-medium
                    transition-all duration-200 flex items-center gap-1.5
                    ${isActive 
                      ? 'text-white shadow-md scale-[1.02]' 
                      : isDarkMode 
                        ? 'bg-gray-700/60 text-gray-300 hover:bg-gray-600/60 hover:scale-[1.02]' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-[1.02]'
                    }
                  `}
                  style={isActive ? { 
                    backgroundColor: tag.color || accentColor,
                    boxShadow: `0 2px 8px ${tag.color || accentColor}50`
                  } : {}}
                  title={isActive 
                    ? t('filter.clickToDeactivate', 'Klicken zum Deaktivieren') 
                    : `${tag.name} (${tag.count} ${t('filter.tasks', 'Aufgaben')})`
                  }
                >
                  <span 
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.5)' : (tag.color || accentColor) }}
                  />
                  {tag.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
