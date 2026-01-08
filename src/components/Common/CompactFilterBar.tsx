import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Filter, 
  X, 
  ChevronDown, 
  ChevronUp,
  AlertCircle, 
  Tag, 
  Calendar,
  Clock,
  Pin,
  Check,
  SlidersHorizontal
} from 'lucide-react';

export type DateFilterOption = 'all' | 'anytime' | 'today' | 'tomorrow' | 'thisWeek';
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
  onClose
}: CompactFilterBarProps) {
  const { t } = useTranslation();
  const [showExpanded, setShowExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Calculate if any filter is active
  const hasActiveFilters = 
    priorityFilter !== 'all' || 
    dateFilter !== 'all' || 
    tagFilters.length > 0 || 
    showCompleted;
  
  const activeFilterCount = 
    (priorityFilter !== 'all' ? 1 : 0) + 
    (dateFilter !== 'all' ? 1 : 0) + 
    tagFilters.length + 
    (showCompleted ? 1 : 0);
  
  // Priority options
  const priorities: { key: PriorityOption | 'all'; label: string; color: string }[] = [
    { key: 'all', label: 'Alle', color: '#6b7280' },
    { key: 'high', label: t('tasks.priority.high', 'Hoch'), color: '#ef4444' },
    { key: 'medium', label: t('tasks.priority.medium', 'Mittel'), color: '#f59e0b' },
    { key: 'low', label: t('tasks.priority.low', 'Niedrig'), color: '#10b981' },
    { key: 'none', label: t('tasks.priority.none', 'Keine'), color: '#9ca3af' }
  ];
  
  // Date filter options
  const dateOptions: { key: DateFilterOption; label: string; icon?: typeof Calendar }[] = [
    { key: 'all', label: t('filter.all', 'Alle') },
    { key: 'anytime', label: t('filter.anytime', 'Jederzeit'), icon: Clock },
    { key: 'today', label: t('filter.today', 'Heute'), icon: Calendar },
    { key: 'tomorrow', label: t('filter.tomorrow', 'Morgen'), icon: Calendar },
    { key: 'thisWeek', label: t('filter.thisWeek', 'Diese Woche'), icon: Calendar }
  ];

  if (!isVisible) return null;

  const baseClasses = isMinimalDesign
    ? 'bg-gray-50/95 dark:bg-gray-800/95 border-gray-200 dark:border-gray-700'
    : isDarkMode 
      ? 'bg-gray-900/95 border-gray-700/50' 
      : 'bg-white/95 border-gray-200/80';

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
      {/* Main Compact Bar */}
      <div className="px-3 py-2 flex items-center gap-2 min-h-[44px]">
        {/* Filter Icon & Label */}
        <div 
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg flex-shrink-0"
          style={{ 
            backgroundColor: `${accentColor}15`,
            color: accentColor 
          }}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold hidden sm:inline">Filter</span>
          {activeFilterCount > 0 && (
            <span 
              className="w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
              style={{ backgroundColor: accentColor }}
            >
              {activeFilterCount}
            </span>
          )}
        </div>
        
        {/* Scrollable Filter Chips */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-x-auto scrollbar-hide flex items-center gap-1.5"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Priority Chips */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {priorities.map(({ key, label, color }) => {
              const isActive = priorityFilter === key;
              return (
                <button
                  key={key}
                  onClick={() => onPriorityChange(key)}
                  className={`
                    px-2 py-1 rounded-md text-[11px] font-medium
                    transition-all duration-200 whitespace-nowrap
                    ${isActive 
                      ? 'text-white shadow-sm scale-[1.02]' 
                      : isDarkMode 
                        ? 'bg-gray-700/60 text-gray-300 hover:bg-gray-600/60' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }
                  `}
                  style={isActive ? { 
                    backgroundColor: color,
                    boxShadow: `0 2px 8px ${color}40`
                  } : {}}
                >
                  {key === 'all' ? (
                    <span className="flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      <span className="hidden xs:inline">{label}</span>
                    </span>
                  ) : label}
                </button>
              );
            })}
          </div>
          
          {/* Divider */}
          <div className={`w-px h-4 flex-shrink-0 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`} />
          
          {/* Date Filter Chips */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {dateOptions.map(({ key, label, icon: Icon }) => {
              const isActive = dateFilter === key;
              return (
                <button
                  key={key}
                  onClick={() => onDateFilterChange(key)}
                  className={`
                    px-2 py-1 rounded-md text-[11px] font-medium
                    transition-all duration-200 whitespace-nowrap flex items-center gap-1
                    ${isActive 
                      ? 'text-white shadow-sm scale-[1.02]' 
                      : isDarkMode 
                        ? 'bg-gray-700/60 text-gray-300 hover:bg-gray-600/60' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }
                  `}
                  style={isActive ? { 
                    backgroundColor: accentColor,
                    boxShadow: `0 2px 8px ${accentColor}40`
                  } : {}}
                >
                  {Icon && <Icon className="w-3 h-3" />}
                  <span className="hidden xs:inline">{label}</span>
                  {!Icon && <span>{label}</span>}
                </button>
              );
            })}
          </div>
          
          {/* Show Completed Toggle */}
          <div className={`w-px h-4 flex-shrink-0 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`} />
          
          <button
            onClick={onShowCompletedToggle}
            className={`
              px-2 py-1 rounded-md text-[11px] font-medium flex items-center gap-1
              transition-all duration-200 whitespace-nowrap flex-shrink-0
              ${showCompleted 
                ? 'bg-green-500 text-white shadow-sm scale-[1.02]' 
                : isDarkMode 
                  ? 'bg-gray-700/60 text-gray-300 hover:bg-gray-600/60' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }
            `}
            style={showCompleted ? { boxShadow: '0 2px 8px rgba(34, 197, 94, 0.4)' } : {}}
          >
            <Check className="w-3 h-3" />
            <span className="hidden sm:inline">{t('filter.showCompleted', 'Erledigte')}</span>
          </button>
        </div>
        
        {/* Right Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Expand Tags Button */}
          {availableTags.length > 0 && (
            <button
              onClick={() => setShowExpanded(!showExpanded)}
              className={`
                p-1.5 rounded-lg transition-all duration-200
                ${isDarkMode 
                  ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }
              `}
              title={showExpanded ? t('filter.hideTags', 'Tags ausblenden') : t('filter.showTags', 'Tags anzeigen')}
            >
              <Tag className="w-3.5 h-3.5" />
              {tagFilters.length > 0 && (
                <span 
                  className="absolute -top-1 -right-1 w-3 h-3 rounded-full text-[8px] font-bold flex items-center justify-center text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  {tagFilters.length}
                </span>
              )}
            </button>
          )}
          
          {/* Pin Button */}
          <button
            onClick={() => onPinnedChange(!isPinned)}
            className={`
              p-1.5 rounded-lg transition-all duration-200
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
            title={isPinned ? t('filter.unpin', 'Filter lösen') : t('filter.pin', 'Filter anpinnen')}
          >
            <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
          </button>
          
          {/* Clear All */}
          {hasActiveFilters && (
            <button
              onClick={onClearAll}
              className={`
                p-1.5 rounded-lg transition-all duration-200
                ${isDarkMode 
                  ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/10' 
                  : 'text-gray-500 hover:text-red-500 hover:bg-red-50'
                }
              `}
              title={t('filter.clearAll', 'Alle zurücksetzen')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          
          {/* Close Button (only if not pinned) */}
          {!isPinned && onClose && (
            <button
              onClick={onClose}
              className={`
                p-1.5 rounded-lg transition-all duration-200
                ${isDarkMode 
                  ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }
              `}
              title={t('common.close', 'Schließen')}
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      
      {/* Expanded Tags Section */}
      {showExpanded && availableTags.length > 0 && (
        <div 
          className={`
            px-3 pb-2 pt-0 border-t
            ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200/80'}
          `}
        >
          <div className="flex flex-wrap gap-1.5 pt-2">
            {availableTags.slice(0, 12).map((tag) => {
              const isActive = tagFilters.includes(tag.name);
              return (
                <button
                  key={tag.id}
                  onClick={() => onTagToggle(tag.name)}
                  className={`
                    px-2 py-1 rounded-md text-[11px] font-medium
                    transition-all duration-200 flex items-center gap-1
                    ${isActive 
                      ? 'text-white shadow-sm scale-[1.02]' 
                      : isDarkMode 
                        ? 'bg-gray-700/60 text-gray-300 hover:bg-gray-600/60' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }
                  `}
                  style={isActive ? { 
                    backgroundColor: tag.color || accentColor,
                    boxShadow: `0 2px 8px ${tag.color || accentColor}40`
                  } : {}}
                >
                  <span 
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.5)' : (tag.color || accentColor) }}
                  />
                  {tag.name}
                  <span className={`text-[9px] ${isActive ? 'text-white/70' : 'text-gray-400'}`}>
                    {tag.count}
                  </span>
                </button>
              );
            })}
            {availableTags.length > 12 && (
              <span className={`text-[11px] px-2 py-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                +{availableTags.length - 12} {t('filter.moreTags', 'weitere')}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// CSS to hide scrollbar
const style = document.createElement('style');
style.textContent = `
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`;
if (!document.querySelector('style[data-compact-filter-bar]')) {
  style.setAttribute('data-compact-filter-bar', 'true');
  document.head.appendChild(style);
}

