import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { Search, Sun, Moon, User, Calendar, Clock, CheckSquare, FileText, AlertCircle, Menu, Settings, Cloud } from 'lucide-react';
import { MaterialIcon } from '../Common/MaterialIcon';
import { TodayTasksWidget } from './TodayTasksWidget';
import { ChecklistWidget } from './ChecklistWidget';
import { DeadlineWidget } from './DeadlineWidget';
import { DraggableWidget } from './DraggableWidget';
import { NextcloudSyncWidget } from './NextcloudSyncWidget';
import { useTranslation } from 'react-i18next';

interface WidgetLayout {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const defaultLayouts: WidgetLayout[] = [
  { id: 'deadlines', x: 0, y: 300, width: 400, height: 350 },
  { id: 'today-tasks', x: 450, y: 300, width: 400, height: 350 },
  { id: 'checklist', x: 850, y: 300, width: 350, height: 350 },
  { id: 'pinned-notes', x: 0, y: 700, width: 400, height: 300 },
  { id: 'nextcloud-sync', x: 450, y: 700, width: 350, height: 280 },
];

interface TodayViewProps {
  onNavigate?: (view: string) => void;
}

export function TodayView({ onNavigate }: TodayViewProps = {}) {
  const { state, dispatch } = useApp();
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showNavigation, setShowNavigation] = useState(false);
  const [widgetLayouts, setWidgetLayouts] = useState<WidgetLayout[]>(defaultLayouts);

  // Check current theme and listen for system theme changes
  useEffect(() => {
    const updateDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    };
    
    // Initial check
    updateDarkMode();
    
    // Listen for system theme changes (relevant when theme === 'system')
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      // Small delay to ensure the dark class has been updated by AppContext
      setTimeout(updateDarkMode, 50);
    };
    
    mediaQuery.addEventListener('change', handleSystemChange);
    
    // Also observe DOM changes to the dark class (catches all theme changes)
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          updateDarkMode();
        }
      });
    });
    
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    return () => {
      mediaQuery.removeEventListener('change', handleSystemChange);
      observer.disconnect();
    };
  }, [state.preferences.theme]);

  // Toggle theme
  const toggleTheme = () => {
    const currentTheme = state.preferences.theme;
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    dispatch({ 
      type: 'UPDATE_PREFERENCES', 
      payload: { theme: newTheme } 
    });
  };

  // Handle widget layout changes
  const handleLayoutChange = (id: string, newLayout: Partial<WidgetLayout>) => {
    setWidgetLayouts(prev => 
      prev.map(layout => 
        layout.id === id ? { ...layout, ...newLayout } : layout
      )
    );
  };

  // Get layout for specific widget
  const getWidgetLayout = (id: string) => {
    return widgetLayouts.find(layout => layout.id === id) || defaultLayouts.find(layout => layout.id === id)!;
  };

  // Handle search across tasks and notes
  const handleSearch = () => {
    if (searchQuery.trim()) {
      // Set search query for tasks
      dispatch({ type: 'SET_SEARCH_QUERY', payload: searchQuery });
      // Set search query for notes
      dispatch({ type: 'SET_NOTES_SEARCH', payload: searchQuery });
      // Navigate to tasks or notes view based on results
      // For now, navigate to tasks
      window.dispatchEvent(new CustomEvent('navigate-to-tasks'));
    }
  };

  // Handle settings navigation
  const handleSettings = () => {
    window.dispatchEvent(new CustomEvent('navigate-to-settings'));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="relative h-full bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Decorative background elements removed */}

      {/* Top Controls */}
      <div className="absolute top-6 left-6 right-6 z-50 flex items-center justify-between">
        {/* Navigation Menu */}
        <div className="relative">
          <button
            onClick={() => setShowNavigation(!showNavigation)}
            className="w-10 h-10 rounded-full bg-white/20 dark:bg-gray-800/20 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 flex items-center justify-center hover:bg-white/30 dark:hover:bg-gray-700/30 transition-all duration-200 shadow-lg"
          >
            <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          
          {/* Navigation Dropdown */}
          {showNavigation && (
            <div className="absolute top-12 left-0 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-600 min-w-48 py-2 backdrop-blur-sm">
              <button
                onClick={() => {
                  onNavigate?.('tasks');
                  setShowNavigation(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                📝 Tagesplaner
              </button>
              <button
                onClick={() => {
                  onNavigate?.('inbox');
                  setShowNavigation(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                📥 Inbox
              </button>
              <button
                onClick={() => {
                  onNavigate?.('notes');
                  setShowNavigation(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                📄 Notizen
              </button>

              <button
                onClick={() => {
                  onNavigate?.('kanban');
                  setShowNavigation(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                📋 Kanban
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-full bg-white/20 dark:bg-gray-800/20 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 flex items-center justify-center hover:bg-white/30 dark:hover:bg-gray-700/30 transition-all duration-200 shadow-lg"
          >
            {isDarkMode ? (
              <Sun className="w-5 h-5 text-yellow-500" />
            ) : (
              <Moon className="w-5 h-5 text-gray-700" />
            )}
          </button>

          {/* Profile Button */}
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="w-10 h-10 rounded-full bg-white/20 dark:bg-gray-800/20 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 flex items-center justify-center hover:bg-white/30 dark:hover:bg-gray-700/30 transition-all duration-200 shadow-lg"
          >
            <User className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 px-8 py-12">
        {/* Settings Button - Top Left */}
        <button
          onClick={handleSettings}
          className="absolute top-8 left-8 w-12 h-12 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group hover:scale-105"
          title="Einstellungen"
        >
          <Settings className="w-5 h-5 text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />
        </button>

        {/* Header Section */}
        <div className="text-center mb-12">
          {/* Date Display */}
          <div className="mb-2">
            <h1 className="text-3xl font-semibold mb-3 font-sans"
              style={{ 
                color: state.preferences.theme === 'dark' ? 'rgb(229, 231, 235)' : 'rgb(55, 65, 81)',
                textShadow: state.preferences.theme === 'dark'
                  ? '0 0 8px rgba(0, 0, 0, 0.8), 0 0 16px rgba(0, 0, 0, 0.5)'
                  : '0 0 8px rgba(255, 255, 255, 0.9), 0 0 16px rgba(255, 255, 255, 0.6)'
              }}>
              {format(new Date(), 'EEEE, d. MMMM', { locale: i18n.language === 'en' ? enUS : de })}
            </h1>
            <div className="flex items-center justify-center space-x-2 text-gray-600 dark:text-gray-400">
              <MaterialIcon name="calendar_today" size={16} style={{ color: state.preferences.accentColor }} />
              <span className="text-sm">{t('today.title')}</span>
            </div>
          </div>

          {/* Fuchs Logo with Text */}
          <div className="flex items-center justify-center space-x-4 mb-6">
            <img 
              src="./Fuchs.svg" 
              alt="Fuchs Logo" 
              className="w-12 h-12 object-contain"
            />
            <p className="text-4xl font-medium tracking-wide" 
              style={{ 
                fontFamily: "'Roboto', sans-serif",
                color: state.preferences.theme === 'dark' ? 'rgb(255, 255, 255)' : 'rgb(31, 41, 55)',
                textShadow: state.preferences.theme === 'dark'
                  ? '0 0 8px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 0, 0, 0.6), 0 2px 4px rgba(0, 0, 0, 0.9)'
                  : '0 0 8px rgba(255, 255, 255, 0.9), 0 0 20px rgba(255, 255, 255, 0.7), 0 2px 4px rgba(0, 0, 0, 0.3)'
              }}>
              {t('today.greeting')}
            </p>
          </div>

          {/* Search Box */}
          <div className="max-w-2xl mx-auto mb-12">
                      <div className="relative">
            <MaterialIcon name="search" className="absolute left-4 top-1/2 transform -translate-y-1/2" size={20} style={{ color: state.preferences.accentColor }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Durchsuche Aufgaben und Notizen..."
                className="w-full pl-12 pr-4 py-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 rounded-full text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent shadow-xl transition-all duration-200"
              />
            </div>
          </div>
        </div>

        {/* Widgets Grid */}
        <div className="relative">
          {/* Deadlines Widget - First Position */}
          <DraggableWidget
            id="deadlines"
            title="Deadlines"
            icon={AlertCircle}
            layout={getWidgetLayout('deadlines')}
            onLayoutChange={handleLayoutChange}
          >
            <DeadlineWidget />
          </DraggableWidget>

          {/* Today Tasks Widget */}
          <DraggableWidget
            id="today-tasks"
            title={t('dashboard.todays_tasks')}
            icon={CheckSquare}
            layout={getWidgetLayout('today-tasks')}
            onLayoutChange={handleLayoutChange}
          >
            <TodayTasksWidget />
          </DraggableWidget>

          {/* Checklist Widget */}
          <DraggableWidget
            id="checklist"
            title={t('dashboard.my_checklist')}
            icon={CheckSquare}
            layout={getWidgetLayout('checklist')}
            onLayoutChange={handleLayoutChange}
          >
            <ChecklistWidget />
          </DraggableWidget>

          {/* Nextcloud Sync Widget */}
          <DraggableWidget
            id="nextcloud-sync"
            title="Nextcloud Backup"
            icon={Cloud}
            layout={getWidgetLayout('nextcloud-sync')}
            onLayoutChange={handleLayoutChange}
          >
            <NextcloudSyncWidget showTitle={false} />
          </DraggableWidget>
        </div>
      </div>
    </div>
  );
} 