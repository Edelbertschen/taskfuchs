import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useAppTranslation } from '../../utils/i18nHelpers';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import type { CalendarSource } from '../../types';
import { ICalService } from '../../utils/icalService';
import { 
  Palette, 
  Globe, 
  Bell, 
  Shield, 
  FileText, 
  Lock,
  Package,
  Trash2,
  Volume2,
  Monitor,
  Sun,
  Moon,
  Download,
  Check,
  Cloud,
  Play,
  Clock,
  ChevronRight,
  ChevronLeft,
  Upload,
  Settings as SettingsIcon,
  Calendar,
  ArrowRight,
  Plus,
  Eye,
  EyeOff,
  Loader,
  X,
  Save,
  MoveRight,
  ArrowDown,
  ArrowUp,
  ArrowLeft,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowUpLeft,
  ArrowUpRight,
  GripVertical,
  Home,
  Inbox,
  CheckSquare,
  Columns,
  Tag as TagIcon,
  BarChart3,
  Archive,
  ClipboardList,
  Pin,
  Image as ImageIcon,
  Smartphone,
  Trophy,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Info,
  Target,
  Zap,
  MoreHorizontal
} from 'lucide-react';
import { DeleteConfirmationModal } from '../Common/DeleteConfirmationModal';
import { PerformanceDashboard } from '../Common/PerformanceDashboard';
import { ImageStorageManager } from '../Common/ImageStorageManager';
import { ImageStorageDebugger } from '../Common/ImageStorageDebugger';
import { MicrosoftToDoSettingsSection } from './MicrosoftToDoSettingsSection';
import { SimpleApiSettings } from './SimpleApiSettings';
import NextcloudSettings from '../Common/NextcloudSettings';
import { NextcloudSection } from '../Common/NextcloudSection';
import { TodoistSetupDialog } from '../Common/TodoistSetupDialogSimple';
import { todoistSyncManager } from '../../utils/todoistSyncManagerNew';
import { StockPhotosModal } from '../Common/StockPhotosModal';
import { ConflictResolutionModal } from '../Common/ConflictResolutionModal';
import { TodoistErrorRecoveryTest } from '../Common/TodoistErrorRecoveryTest';
import { stockPhotosService } from '../../utils/stockPhotosService';
import * as ImportExport from '../../utils/importExport';
import { playCompletionSound, SoundType, debugAudioSetup, testWhiteNoise } from '../../utils/soundUtils';
import { syncManager, SyncLogEntry, SyncStats } from '../../utils/syncUtils';


import type { KanbanBoard, Tag, SyncStatus } from '../../types';

const gradientDirections = [
  { value: 'to bottom right', label: 'Nach unten rechts', icon: ArrowDownRight },
  { value: 'to right', label: 'Nach rechts', icon: MoveRight },
  { value: 'to bottom', label: 'Nach unten', icon: ArrowDown },
  { value: 'to left', label: 'Nach links', icon: ArrowLeft },
  { value: 'to top', label: 'Nach oben', icon: ArrowUp },
  { value: 'to top right', label: 'Nach oben rechts', icon: ArrowUpRight },
  { value: 'to bottom left', label: 'Nach unten links', icon: ArrowDownLeft },
  { value: 'to top left', label: 'Nach oben links', icon: ArrowUpLeft }
];

const Settings = React.memo(() => {
  const { t, i18n } = useTranslation();
  const { actions, forms, titles, messages } = useAppTranslation();
  const { state, dispatch } = useApp();

  // Settings sections configuration with i18n
  const settingsSections = [
    {
      id: 'language',
      title: t('settings.sections.language.title'),
      icon: Globe,
      description: t('settings.sections.language.description')
    },
    {
      id: 'appearance',
      title: t('settings.sections.appearance.title'),
      icon: Palette,
      description: t('settings.sections.appearance.description')
    },
    {
      id: 'notes',
      title: t('settings.sections.notes.title'),
      icon: FileText,
      description: t('settings.sections.notes.description')
    },
    {
      id: 'sidebar',
      title: t('settings.sections.sidebar.title'),
      icon: SettingsIcon,
      description: t('settings.sections.sidebar.description')
    },
    {
      id: 'notifications',
      title: t('settings.sections.notifications.title'),
      icon: Bell,
      description: t('settings.sections.notifications.description')
    },
    {
      id: 'timer',
      title: 'Zeiterfassung & Pomodoro',
      icon: Clock,
      description: t('settings.sections.timer.description')
    },
    {
      id: 'sync',
      title: t('settings.sections.sync.title'),
      icon: Cloud,
      description: 'Sync & Onlinebackups'
    },
    {
      id: 'data',
      title: t('settings.sections.data.title'),
      icon: Package,
      description: t('settings.sections.data.description')
    },
    {
      id: 'informationen',
      title: 'Informationen',
      icon: Shield,
      description: 'Datenschutz & Performance'
    }
  ];
  const [activeSection, setActiveSection] = useState('appearance');
  const [activeIntegrationTab, setActiveIntegrationTab] = useState('simple-apis');
  const [activeInfoTab, setActiveInfoTab] = useState<'privacy' | 'performance'>('privacy');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Todoist Integration States
  const [todoistEnabled, setTodoistEnabled] = useState(state.preferences.todoist?.enabled || false);
  const [todoistApiToken, setTodoistApiToken] = useState(state.preferences.todoist?.apiToken || '');
  const [todoistSyncTags, setTodoistSyncTags] = useState(state.preferences.todoist?.syncTags || ['todoist']);
  const [todoistConnectionStatus, setTodoistConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [todoistConnectionMessage, setTodoistConnectionMessage] = useState('');
  const [todoistProjects, setTodoistProjects] = useState<any[]>([]);
  const [isTodoistTesting, setIsTodoistTesting] = useState(false);
  const [isLoadingTodoistProjects, setIsLoadingTodoistProjects] = useState(false);
  const [todoistSyncStatus, setTodoistSyncStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [todoistSyncMessage, setTodoistSyncMessage] = useState('');
  const [todoistSyncProgress, setTodoistSyncProgress] = useState(0);
  const [todoistLastSyncResult, setTodoistLastSyncResult] = useState<any>(null);

  // New Todoist Sync Manager states
  const [todoistSetupDialogOpen, setTodoistSetupDialogOpen] = useState(false);
  const [errorRecoveryTestOpen, setErrorRecoveryTestOpen] = useState(false);
  const [newTodoistSyncConfig, setNewTodoistSyncConfig] = useState(todoistSyncManager.getConfig());
  const [newTodoistSyncStatus, setNewTodoistSyncStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [newTodoistSyncMessage, setNewTodoistSyncMessage] = useState('');
  const [newTodoistSyncResult, setNewTodoistSyncResult] = useState<any>(null);
  const [todoistConflicts, setTodoistConflicts] = useState<any[]>([]);
  const [conflictResolutionOpen, setConflictResolutionOpen] = useState(false);
  // NEW: Enhanced sync status tracking
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStep, setSyncStep] = useState('');
  const [syncErrors, setSyncErrors] = useState<string[]>([]);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<string | null>(null);
  const [lastFullSyncTimestamp, setLastFullSyncTimestamp] = useState<string | null>(null);

  // Load new Todoist sync configuration
  useEffect(() => {
    const config = todoistSyncManager.getConfig();
    setNewTodoistSyncConfig(config);
    
    // Load last sync timestamps
    if (config?.lastSyncState) {
      setLastSyncTimestamp(config.lastSyncState.timestamp || null);
      setLastFullSyncTimestamp(config.lastSyncState.lastFullSyncTimestamp || null);
    }
  }, []);

  // Format timestamp for display
  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return 'Nie';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMinutes < 1) return 'Gerade eben';
    if (diffMinutes < 60) return `vor ${diffMinutes} Min`;
    if (diffHours < 24) return `vor ${diffHours}h`;
    if (diffDays === 1) return 'Gestern';
    if (diffDays < 7) return `vor ${diffDays} Tagen`;
    
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Sync local state with saved preferences
  useEffect(() => {
    if (state.preferences.todoist) {
      setTodoistEnabled(state.preferences.todoist.enabled || false);
      setTodoistApiToken(state.preferences.todoist.apiToken || '');
      setTodoistSyncTags(state.preferences.todoist.syncTags || ['todoist']);
      
      // Load projects if API token is available but projects are not loaded
      if (state.preferences.todoist.apiToken && 
          state.preferences.todoist.enabled && 
          todoistProjects.length === 0 && 
          !isLoadingTodoistProjects &&
          todoistConnectionStatus === 'idle') {
        testTodoistConnection();
      }
    }
  }, [state.preferences.todoist]);
  
  // All existing state variables...
  const [isDarkMode, setIsDarkMode] = useState(
    document.documentElement.classList.contains('dark')
  );
  const [language, setLanguage] = useState(i18n.language);
  const [notifications, setNotifications] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [defaultPriority, setDefaultPriority] = useState<'none' | 'low' | 'medium' | 'high'>('medium');
  const [theme, setTheme] = useState('fox-orange');
  const [showSaved, setShowSaved] = useState(false);
  const [showNextcloudSettings, setShowNextcloudSettings] = useState(false);
  const [customAccentColor, setCustomAccentColor] = useState('#e06610');
  const [customSecondaryColor, setCustomSecondaryColor] = useState('#22c55e');
  const [customSuccessColor, setCustomSuccessColor] = useState('#10b981');
  const [customWarningColor, setCustomWarningColor] = useState('#f59e0b');
  const [customDangerColor, setCustomDangerColor] = useState('#ef4444');
  const [hexInput, setHexInput] = useState('#e06610');

  // Available accent colors
  const accentColors = [
    '#e06610',
    '#9a244f',
    '#7b2ff2',
    '#006d8f',
    '#00a78e',
    '#00b92a',
    '#2f4f4f',
    '#7c2a00',
    '#c600ff'
  ];

  // Available background colors (same as accent colors)
  const backgroundColors = [
    '#e06610',
    '#9a244f',
    '#7b2ff2',
    '#006d8f',
    '#00a78e',
    '#00b92a',
    '#2f4f4f',
    '#7c2a00',
    '#c600ff'
  ];
  const [showClearDataModal, setShowClearDataModal] = useState(false);
  const [showImageStorageManager, setShowImageStorageManager] = useState(false);
  const [showImageStorageDebugger, setShowImageStorageDebugger] = useState(false);
  const [showDeleteImageModal, setShowDeleteImageModal] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<string>('');
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(state.preferences.backgroundImage || '');
  
  // Background settings state
  const [backgroundColorTemp, setBackgroundColorTemp] = useState(state.preferences.backgroundColor || '#f3f4f6');
  const [gradientFromTemp, setGradientFromTemp] = useState(state.preferences.gradientFrom || '#f3f4f6');
  const [gradientToTemp, setGradientToTemp] = useState(state.preferences.gradientTo || '#e5e7eb');
  const [gradientDirectionTemp, setGradientDirectionTemp] = useState(state.preferences.gradientDirection || 'to bottom right');
  const [hasUnsavedBgChanges, setHasUnsavedBgChanges] = useState(false);
  
  // Background image gallery state
  const [backgroundImageGallery, setBackgroundImageGallery] = useState(() => {
    // Use local bundled backgrounds from public/backgrounds
    const desiredDefaults = Array.from({ length: 12 }, (_, i) => `/backgrounds/bg${i + 1}.jpg`);
    const savedGallery = localStorage.getItem('backgroundImageGallery');
    
    if (savedGallery) {
      const existingGallery = JSON.parse(savedGallery);
      // Drop legacy remote URLs and only keep local paths (e.g., /backgrounds/...)
      const localOnly = (existingGallery as string[]).filter((url: string) => url.startsWith('/'));
      // Ensure the default set exists at the front, then keep any remaining user-added local images after
      const merged = [
        ...desiredDefaults,
        ...localOnly.filter((url: string) => !desiredDefaults.includes(url))
      ];
      if (JSON.stringify(merged) !== JSON.stringify(existingGallery)) {
        localStorage.setItem('backgroundImageGallery', JSON.stringify(merged));
        return merged;
      }
      return existingGallery;
    }
    
    localStorage.setItem('backgroundImageGallery', JSON.stringify(desiredDefaults));
    return desiredDefaults;
  });
  
  // Modal states for improved UI
  const [showImageUrlModal, setShowImageUrlModal] = useState(false);
  const [showColorPickerModal, setShowColorPickerModal] = useState(false);
  const [colorPickerType, setColorPickerType] = useState<'background' | 'gradientFrom' | 'gradientTo'>('background');
  const [tempImageUrl, setTempImageUrl] = useState('');
  const [tempColorValue, setTempColorValue] = useState('#f3f4f6');
  const [showPhotoCreditsModal, setShowPhotoCreditsModal] = useState(false);
  
  // Stock Photos modal state
  const [showStockPhotosModal, setShowStockPhotosModal] = useState(false);
  
  // Enhanced Nextcloud Synchronization
  const [nextcloudUrl, setNextcloudUrl] = useState(localStorage.getItem('nextcloudUrl') || '');
  
  // Toggl Integration Settings
  const [togglEnabled, setTogglEnabled] = useState(state.preferences.toggl?.enabled || false);
  const [togglApiToken, setTogglApiToken] = useState(state.preferences.toggl?.apiToken || '');
  const [togglWorkspaceId, setTogglWorkspaceId] = useState(state.preferences.toggl?.workspaceId || '');
  const [togglDefaultProjectId, setTogglDefaultProjectId] = useState(state.preferences.toggl?.defaultProjectId || '');
  const [togglAutoSync, setTogglAutoSync] = useState(state.preferences.toggl?.autoSync ?? true);
  const [togglSyncOnStart, setTogglSyncOnStart] = useState(state.preferences.toggl?.syncOnStart ?? true);
  const [togglSyncOnPause, setTogglSyncOnPause] = useState(state.preferences.toggl?.syncOnPause ?? true);
  const [togglSyncOnStop, setTogglSyncOnStop] = useState(state.preferences.toggl?.syncOnStop ?? true);
  const [togglCreateProjects, setTogglCreateProjects] = useState(state.preferences.toggl?.createProjectsAutomatically ?? true);
  const [togglUseTaskDescriptions, setTogglUseTaskDescriptions] = useState(state.preferences.toggl?.useTaskDescriptions ?? true);
  const [togglRoundTime, setTogglRoundTime] = useState(state.preferences.toggl?.roundTimeToMinutes ?? true);
  const [togglConnectionStatus, setTogglConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [togglConnectionMessage, setTogglConnectionMessage] = useState('');
  const [togglWorkspaces, setTogglWorkspaces] = useState<any[]>([]);
  const [togglProjects, setTogglProjects] = useState<any[]>([]);

  // CalDAV Integration Settings
  const [caldavEnabled, setCaldavEnabled] = useState(state.preferences.caldav?.enabled || false);
  const [caldavServerUrl, setCaldavServerUrl] = useState(state.preferences.caldav?.serverUrl || '');
  const [caldavUsername, setCaldavUsername] = useState(state.preferences.caldav?.username || '');
  const [caldavPassword, setCaldavPassword] = useState(state.preferences.caldav?.password || '');
  const [caldavCalendarUrl, setCaldavCalendarUrl] = useState(state.preferences.caldav?.calendarUrl || '');
  const [caldavAutoSync, setCaldavAutoSync] = useState(state.preferences.caldav?.autoSync ?? true);
  const [caldavSyncInterval, setCaldavSyncInterval] = useState(state.preferences.caldav?.syncInterval ?? 30);
  const [caldavSyncOnStart, setCaldavSyncOnStart] = useState(state.preferences.caldav?.syncOnStart ?? true);
  const [caldavSyncOnTaskChange, setCaldavSyncOnTaskChange] = useState(state.preferences.caldav?.syncOnTaskChange ?? true);
  const [caldavBidirectionalSync, setCaldavBidirectionalSync] = useState(state.preferences.caldav?.bidirectionalSync ?? true);
  const [caldavConflictResolution, setCaldavConflictResolution] = useState(state.preferences.caldav?.conflictResolution || 'manual');
  const [caldavConnectionStatus, setCaldavConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [caldavConnectionMessage, setCaldavConnectionMessage] = useState('');
  const [caldavIsSyncing, setCaldavIsSyncing] = useState(false);
  const [caldavSyncProgress, setCaldavSyncProgress] = useState(0);

  // iCal Import Settings
  const [icalEnabled, setIcalEnabled] = useState(state.preferences.calendars?.showInPlanner ?? true);
  const [icalSources, setIcalSources] = useState<CalendarSource[]>(state.calendarSources || []);
  const [newIcalUrl, setNewIcalUrl] = useState('');
  const [newIcalName, setNewIcalName] = useState('');
  const [icalTestingUrl, setIcalTestingUrl] = useState<string | null>(null);
  const [icalSyncingSource, setIcalSyncingSource] = useState<string | null>(null);
  const [icalErrors, setIcalErrors] = useState<Record<string, string>>({});
  const [icalTestResults, setIcalTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [caldavSyncMessage, setCaldavSyncMessage] = useState('');
  const [caldavCalendars, setCaldavCalendars] = useState<any[]>([]);
  const [caldavCalendarsLoading, setCaldavCalendarsLoading] = useState(false);
  const [showCaldavPassword, setShowCaldavPassword] = useState(false);

  const [nextcloudUsername, setNextcloudUsername] = useState(localStorage.getItem('nextcloudUsername') || '');
  const [nextcloudPassword, setNextcloudPassword] = useState('');
  const [nextcloudFolder, setNextcloudFolder] = useState(localStorage.getItem('nextcloudFolder') || '/TaskFuchs');
  const [syncEnabled, setSyncEnabled] = useState(localStorage.getItem('syncEnabled') === 'true');
  const [lastSync, setLastSync] = useState(localStorage.getItem('lastSync') || 'Noch nie');
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>(
    (localStorage.getItem('connectionStatus') as any) || 'disconnected'
  );
  const [connectionError, setConnectionError] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  
  // Extended sync state
  const [syncSetupStep, setSyncSetupStep] = useState(1);
  const [showSyncSetup, setShowSyncSetup] = useState(false);
  const [syncInterval, setSyncInterval] = useState(parseInt(localStorage.getItem('syncInterval') || '30'));
  const [autoSync, setAutoSync] = useState(localStorage.getItem('autoSync') === 'true');
  const [syncLog, setSyncLog] = useState<SyncLogEntry[]>([]);
  const [syncStats, setSyncStats] = useState<SyncStats>({
    tasksUploaded: 0,
    tasksDownloaded: 0,
    notesUploaded: 0,
    notesDownloaded: 0,
    conflictsResolved: 0,
    errors: 0
  });
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    connected: false,
    isActive: false,
    lastSync: '',
    status: 'idle'
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncLog, setShowSyncLog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showPerformanceDashboard, setShowPerformanceDashboard] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [configurationError, setConfigurationError] = useState<string | null>(null);

  // iCal Calendar Management

  const [isImporting, setIsImporting] = useState(false);

  // Sidebar customization state
  const [sidebarItems, setSidebarItems] = useState(() => {
    const defaultItems = [
      { id: 'today', label: t('navigation.today'), icon: Home, visible: true },
      { id: 'inbox', label: 'Inbox', icon: Inbox, visible: true },
      { id: 'review', label: 'Review', icon: ClipboardList, visible: true },
      { id: 'tasks', label: t('navigation.planner'), icon: CheckSquare, visible: true },
      { id: 'kanban', label: t('navigation.projects'), icon: Columns, visible: true },
      { id: 'pins', label: t('navigation.pins'), icon: Pin, visible: true },
      { id: 'notes', label: t('navigation.notes'), icon: FileText, visible: true },
      { id: 'series', label: t('navigation.series'), icon: RefreshCw, visible: true },
      { id: 'tags', label: 'Tags', icon: TagIcon, visible: true },
      { id: 'statistics', label: t('navigation.reports'), icon: BarChart3, visible: true },
      { id: 'archive', label: t('navigation.archive'), icon: Archive, visible: true }
    ];
    
    const hiddenItems = state.preferences.sidebar?.hiddenItems || [];
    const itemOrder = state.preferences.sidebar?.itemOrder || [];
    
    // Apply visibility settings
    const itemsWithVisibility = defaultItems.map(item => ({
      ...item,
      visible: !hiddenItems.includes(item.id)
    }));
    
    // Apply custom order if available
    if (itemOrder.length > 0) {
      const orderedItems = itemOrder
        .map(id => itemsWithVisibility.find(item => item.id === id))
        .filter(Boolean);
      
      const remainingItems = itemsWithVisibility.filter(item => 
        !itemOrder.includes(item.id)
      );
      
      return [...orderedItems, ...remainingItems];
    }
    
    return itemsWithVisibility;
  });

  // Initialize temp states from current preferences
  useEffect(() => {
    setBackgroundColorTemp(state.preferences.backgroundColor || '#f3f4f6');
    setGradientFromTemp(state.preferences.gradientFrom || '#f3f4f6');
    setGradientToTemp(state.preferences.gradientTo || '#e5e7eb');
    setGradientDirectionTemp(state.preferences.gradientDirection || 'to bottom right');
    setHasUnsavedBgChanges(false);
  }, [state.preferences.backgroundType]);

  // Load saved theme colors on component mount
  useEffect(() => {
    const savedAccentColor = localStorage.getItem('customAccentColor') || '#e06610';
    const savedSecondaryColor = localStorage.getItem('customSecondaryColor') || '#22c55e';
    const savedSuccessColor = localStorage.getItem('customSuccessColor') || '#10b981';
    const savedWarningColor = localStorage.getItem('customWarningColor') || '#f59e0b';
    const savedDangerColor = localStorage.getItem('customDangerColor') || '#ef4444';
    
    setCustomAccentColor(savedAccentColor);
    setCustomSecondaryColor(savedSecondaryColor);
    setCustomSuccessColor(savedSuccessColor);
    setCustomWarningColor(savedWarningColor);
    setCustomDangerColor(savedDangerColor);
    setHexInput(savedAccentColor);
    
    // Apply colors to CSS custom properties
    applyThemeColors(savedAccentColor, savedSecondaryColor, savedSuccessColor, savedWarningColor, savedDangerColor);
    
    // Update global state with saved accent color
    dispatch({
      type: 'UPDATE_PREFERENCES',
      payload: { accentColor: savedAccentColor }
    });
  }, [dispatch]);

  // Add search event listener
  useEffect(() => {
    const handleSettingsSearch = (event: CustomEvent) => {
      setSearchQuery(event.detail.query);
    };

    window.addEventListener('settings-search', handleSettingsSearch as EventListener);
    return () => {
      window.removeEventListener('settings-search', handleSettingsSearch as EventListener);
    };
  }, []);

  // Initialize sync manager and load sync log
  useEffect(() => {
    const loadSyncData = async () => {
      setSyncLog(syncManager.getSyncLog());
      setIsSyncing(syncManager.isSyncingNow());
      
      // Setup status updates
      const handleStatusUpdate = (status: SyncStatus) => {
        setSyncStatus(status);
        setConnectionStatus(status.connected ? 'connected' : 'disconnected');
        if (status.lastSync) {
          setLastSync(new Date(status.lastSync).toLocaleString('de-DE'));
        }
      };
      
      syncManager.onStatusChange(handleStatusUpdate);
      
      // Start auto-sync if enabled
      if (autoSync && syncEnabled && syncManager.isConfigured()) {
        syncManager.startAutoSync(syncInterval);
      }
      
      return () => {
        syncManager.removeStatusCallback(handleStatusUpdate);
      };
    };
    
    loadSyncData();
  }, [autoSync, syncEnabled, syncInterval]);

  // Save gallery to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('backgroundImageGallery', JSON.stringify(backgroundImageGallery));
  }, [backgroundImageGallery]);

  // Set new default image as background if no image is currently set
  useEffect(() => {
    const defaultImage = 'https://pixabay.com/get/g130a7d6d61e42bcb9827277b30f578d67e48f415fa0f6c37170495993bb099b60661dc2f5c32879d0888ef0c577a2f24.jpg';
    if (!state.preferences.backgroundImage && backgroundImageGallery.includes(defaultImage)) {
      dispatch({
        type: 'UPDATE_PREFERENCES',
        payload: {
          backgroundImage: defaultImage,
          backgroundType: 'image'
        }
      });
    }
  }, [state.preferences.backgroundImage, backgroundImageGallery, dispatch]);

  const getAccentColorStyles = () => {
    const accentColor = state.preferences.accentColor || customAccentColor;
    return {
      bg: { backgroundColor: accentColor },
      text: { color: accentColor },
      border: { borderColor: accentColor },
      bgHover: { backgroundColor: `${accentColor}dd` },
      bgLight: { backgroundColor: `${accentColor}20` },
      bgSemiLight: { backgroundColor: `${accentColor}40` },
      bgSemiDark: { backgroundColor: `${accentColor}80` }
    };
  };

  // All handler functions...
  const applyThemeColors = (accent: string, secondary: string, success: string, warning: string, danger: string) => {
    const root = document.documentElement;
    root.style.setProperty('--accent-color', accent);
    root.style.setProperty('--secondary-color', secondary);
    root.style.setProperty('--success-color', success);
    root.style.setProperty('--warning-color', warning);
    root.style.setProperty('--danger-color', danger);
  };

  const handleColorChange = (colorType: 'accent' | 'secondary' | 'success' | 'warning' | 'danger', color: string) => {
    switch (colorType) {
      case 'accent':
        setCustomAccentColor(color);
        setHexInput(color);
        localStorage.setItem('customAccentColor', color);
        dispatch({
          type: 'UPDATE_PREFERENCES',
          payload: { accentColor: color }
        });
        break;
      case 'secondary':
        setCustomSecondaryColor(color);
        localStorage.setItem('customSecondaryColor', color);
        break;
      case 'success':
        setCustomSuccessColor(color);
        localStorage.setItem('customSuccessColor', color);
        break;
      case 'warning':
        setCustomWarningColor(color);
        localStorage.setItem('customWarningColor', color);
        break;
      case 'danger':
        setCustomDangerColor(color);
        localStorage.setItem('customDangerColor', color);
        break;
    }
    
    // Apply the colors
    applyThemeColors(
      colorType === 'accent' ? color : customAccentColor,
      colorType === 'secondary' ? color : customSecondaryColor,
      colorType === 'success' ? color : customSuccessColor,
      colorType === 'warning' ? color : customWarningColor,
      colorType === 'danger' ? color : customDangerColor
    );
  };

  const handleDarkModeToggle = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  };

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  const handleBackgroundImageChange = (url: string) => {
    setBackgroundImageUrl(url);
    
    // Update recent background images list
    const currentRecentImages = state.preferences.recentBackgroundImages || [];
    const newRecentImages = [url, ...currentRecentImages.filter(img => img !== url)].slice(0, 5);
    
    dispatch({
      type: 'UPDATE_PREFERENCES',
      payload: { 
        backgroundImage: url,
        recentBackgroundImages: newRecentImages
      }
    });
  };

  const handleBackgroundTypeChange = (type: 'image' | 'color' | 'gradient') => {
    dispatch({ 
      type: 'UPDATE_PREFERENCES', 
      payload: { backgroundType: type }
    });
  };

  const handleSaveBackgroundSettings = () => {
    if (state.preferences.backgroundType === 'color') {
      dispatch({ 
        type: 'UPDATE_PREFERENCES', 
        payload: { backgroundColor: backgroundColorTemp }
      });
    } else if (state.preferences.backgroundType === 'gradient') {
      dispatch({ 
        type: 'UPDATE_PREFERENCES', 
        payload: { 
          gradientFrom: gradientFromTemp,
          gradientTo: gradientToTemp,
          gradientDirection: gradientDirectionTemp as any
        }
      });
    }
    setHasUnsavedBgChanges(false);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  const handleTempBackgroundColorChange = (color: string) => {
    setBackgroundColorTemp(color);
    // Apply immediately to global state
    dispatch({ 
      type: 'UPDATE_PREFERENCES', 
      payload: { backgroundColor: color }
    });
  };

  const handleTempGradientFromChange = (color: string) => {
    setGradientFromTemp(color);
    // Apply immediately to global state
    dispatch({ 
      type: 'UPDATE_PREFERENCES', 
      payload: { gradientFrom: color }
    });
  };

  const handleTempGradientToChange = (color: string) => {
    setGradientToTemp(color);
    // Apply immediately to global state
    dispatch({ 
      type: 'UPDATE_PREFERENCES', 
      payload: { gradientTo: color }
    });
  };

  const handleTempGradientDirectionChange = (direction: string) => {
    setGradientDirectionTemp(direction);
    // Apply immediately to global state
    dispatch({ 
      type: 'UPDATE_PREFERENCES', 
      payload: { gradientDirection: direction as any }
    });
  };



  // Sidebar customization handlers
  const handleSidebarItemVisibilityToggle = (itemId: string) => {
    // Don't allow hiding essential items
    const essentialItems = ['today', 'inbox', 'tasks'];
    if (essentialItems.includes(itemId)) return;
    
    const updatedItems = sidebarItems.map(item =>
      item.id === itemId ? { ...item, visible: !item.visible } : item
    );
    setSidebarItems(updatedItems);
    
    const hiddenItems = updatedItems
      .filter(item => !item.visible)
      .map(item => item.id);
    
    dispatch({
      type: 'UPDATE_PREFERENCES',
      payload: {
        sidebar: {
          ...state.preferences.sidebar,
          hiddenItems
        }
      }
    });
  };

  const handleSidebarItemReorder = (fromIndex: number, toIndex: number) => {
    const newItems = [...sidebarItems];
    const [movedItem] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, movedItem);
    setSidebarItems(newItems);
    
    const itemOrder = newItems.map(item => item.id);
    dispatch({
      type: 'UPDATE_PREFERENCES',
      payload: {
        sidebar: {
          ...state.preferences.sidebar,
          itemOrder
        }
      }
    });
  };

  const handleTestSound = async (soundType: SoundType) => {
    try {
      await playCompletionSound(soundType, state.preferences.soundVolume);
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  // Toggl Integration Handler Functions
  const handleTogglSettingsChange = (updates: Partial<typeof state.preferences.toggl>) => {
    dispatch({
      type: 'UPDATE_PREFERENCES',
      payload: {
        toggl: {
          ...state.preferences.toggl,
          ...updates
        }
      }
    });
  };

  const handleTogglConnectionTest = async () => {
    if (!togglApiToken.trim()) {
      setTogglConnectionStatus('error');
      setTogglConnectionMessage('Bitte geben Sie einen gültigen API-Token ein');
      return;
    }

    setTogglConnectionStatus('testing');
    setTogglConnectionMessage('Verbindung wird getestet...');

    try {
      const { togglService } = await import('../../utils/togglService');
      
      // Update service with current settings
      togglService.updatePreferences({
        ...state.preferences,
        toggl: {
          ...state.preferences.toggl,
          apiToken: togglApiToken,
          workspaceId: togglWorkspaceId,
        }
      });

      const result = await togglService.testConnection();
      
      if (result.success) {
        setTogglConnectionStatus('success');
        setTogglConnectionMessage(result.message);
        
        // Load workspaces
        const workspaces = await togglService.getWorkspacesForTest();
        setTogglWorkspaces(workspaces);
        
        // Load projects if workspace is selected
        if (togglWorkspaceId) {
          const projects = await togglService.getProjectsForTest(parseInt(togglWorkspaceId));
          setTogglProjects(projects);
        }
      } else {
        setTogglConnectionStatus('error');
        setTogglConnectionMessage(result.message);
      }
    } catch (error) {
      setTogglConnectionStatus('error');
      setTogglConnectionMessage(error instanceof Error ? error.message : 'Verbindungstest fehlgeschlagen');
    }
  };

  const handleTogglWorkspaceChange = async (workspaceId: string) => {
    setTogglWorkspaceId(workspaceId);
    
    if (workspaceId && togglApiToken) {
      try {
        const { togglService } = await import('../../utils/togglService');
        togglService.updatePreferences({
          ...state.preferences,
          toggl: {
            ...state.preferences.toggl,
            apiToken: togglApiToken,
            workspaceId: workspaceId,
          }
        });
        
        const projects = await togglService.getProjectsForTest(parseInt(workspaceId));
        setTogglProjects(projects);
      } catch (error) {
        console.error('Failed to load projects:', error);
      }
    }
  };

  const handleTogglSaveSettings = () => {
    handleTogglSettingsChange({
      enabled: togglEnabled,
      apiToken: togglApiToken,
      workspaceId: togglWorkspaceId,
      defaultProjectId: togglDefaultProjectId,
      autoSync: togglAutoSync,
      syncOnStart: togglSyncOnStart,
      syncOnPause: togglSyncOnPause,
      syncOnStop: togglSyncOnStop,
      createProjectsAutomatically: togglCreateProjects,
      useTaskDescriptions: togglUseTaskDescriptions,
      roundTimeToMinutes: togglRoundTime,
    });
    
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  // CalDAV Handler Functions
  const handleCalDAVSettingsChange = (updates: Partial<typeof state.preferences.caldav>) => {
    dispatch({
      type: 'UPDATE_PREFERENCES',
      payload: {
        caldav: {
          ...state.preferences.caldav,
          ...updates,
        },
      },
    });
  };

  const handleCalDAVConnectionTest = async () => {
    if (!caldavServerUrl.trim() || !caldavUsername.trim() || !caldavPassword.trim()) {
      setCaldavConnectionStatus('error');
      setCaldavConnectionMessage('Bitte geben Sie alle Verbindungsdaten ein.');
      return;
    }

    setCaldavConnectionStatus('testing');
    setCaldavConnectionMessage('Verbindung wird getestet...');
    setCaldavCalendars([]); // Reset calendars
    setCaldavCalendarsLoading(false);

    // Open console for debugging
    console.log('🚀 CalDAV Verbindungstest gestartet');
    console.log('📋 Bitte öffnen Sie die Browser-Konsole (F12) für detaillierte Diagnose-Informationen');

    try {
      // Import correct CalDAV service
      const { getCalDAVService } = await import('../../utils/caldavService');
      const caldavService = getCalDAVService({
        serverUrl: caldavServerUrl,
        username: caldavUsername,
        password: caldavPassword,
        calendarUrl: caldavCalendarUrl,
        connected: false,
      });

      const result = await caldavService.testConnection();
      
      if (result.success) {
        setCaldavConnectionStatus('success');
        setCaldavConnectionMessage('Verbindung erfolgreich! Lade Kalender...');
        
        // Immediate calendar loading
        setCaldavCalendarsLoading(true);
        console.log('🔍 Starting calendar discovery...');
        
        try {
          const calendars = await caldavService.getCalendars();
          console.log('📅 Calendars found:', calendars);
          
          // Force state update
          setCaldavCalendars([...calendars]);
          
          if (calendars.length > 0) {
            setCaldavConnectionMessage(
              `Verbindung erfolgreich! ${calendars.length} Kalender gefunden. Bitte wählen Sie unten einen Kalender für die Synchronisation aus.`
            );
            console.log('✅ Calendar selection should now be visible');
          } else {
            setCaldavConnectionMessage('Verbindung erfolgreich, aber keine Todo-Kalender gefunden.');
            // Create a fallback calendar for testing
            const fallbackCalendar = {
              name: 'default',
              displayName: 'Standard Kalender (Fallback)',
              url: caldavServerUrl.endsWith('/') ? caldavServerUrl + 'calendars/' : caldavServerUrl + '/calendars/',
              description: 'Automatisch erstellter Kalender für Tests',
              todoCount: 0
            };
            setCaldavCalendars([fallbackCalendar]);
            setCaldavConnectionMessage('Verbindung erfolgreich! 1 Fallback-Kalender erstellt.');
          }
        } catch (error) {
          console.error('❌ Failed to load calendars:', error);
          setCaldavConnectionMessage('Verbindung erfolgreich, aber Kalender konnten nicht geladen werden.');
          
          // Create emergency fallback for testing
          const emergencyCalendar = {
            name: 'emergency',
            displayName: 'Notfall-Kalender (Test)',
            url: caldavServerUrl,
            description: 'Notfall-Kalender für CalDAV-Tests',
            todoCount: 0
          };
          setCaldavCalendars([emergencyCalendar]);
          setCaldavConnectionMessage('Verbindung erfolgreich! Notfall-Kalender erstellt für Tests.');
        } finally {
          setCaldavCalendarsLoading(false);
        }
      } else {
        setCaldavConnectionStatus('error');
        setCaldavConnectionMessage(result.error || 'Verbindung fehlgeschlagen');
        setCaldavCalendars([]);
      }
    } catch (error) {
      console.error('❌ CalDAV connection test failed:', error);
      setCaldavConnectionStatus('error');
      setCaldavConnectionMessage(error instanceof Error ? error.message : 'Unbekannter Fehler');
      setCaldavCalendars([]);
    }
  };

  const handleCalDAVSync = async () => {
    if (!caldavEnabled) {
      setCaldavConnectionMessage('CalDAV-Synchronisation ist nicht aktiviert.');
      return;
    }
    
    if (!caldavServerUrl || !caldavUsername || !caldavPassword) {
      setCaldavConnectionMessage('Bitte geben Sie alle Verbindungsdaten ein.');
      return;
    }
    
    if (!caldavCalendarUrl) {
      setCaldavConnectionMessage('Bitte wählen Sie einen Kalender aus.');
      return;
    }

    setCaldavIsSyncing(true);
    setCaldavSyncProgress(0);
    setCaldavSyncMessage('Synchronisation wird gestartet...');

    try {
      const { getCalDAVService } = await import('../../utils/caldavService');
      const caldavService = getCalDAVService({
        serverUrl: caldavServerUrl,
        username: caldavUsername,
        password: caldavPassword,
        calendarUrl: caldavCalendarUrl,
        connected: true,
      });

      const result = await caldavService.syncTasks(state.tasks, {
        conflictResolution: caldavConflictResolution,
        onProgress: (progress, message) => {
          setCaldavSyncProgress(progress);
          setCaldavSyncMessage(message);
        },
      });

      if (result.success) {
        setCaldavConnectionMessage(
          `Synchronisation erfolgreich! ${result.added} hinzugefügt, ${result.updated} aktualisiert, ${result.conflicts.length} Konflikte`
        );
        
        // Update last sync time
        handleCalDAVSettingsChange({
          lastSync: new Date().toISOString(),
          lastSyncStatus: 'success',
        });
      } else {
        setCaldavConnectionMessage(`Synchronisation fehlgeschlagen: ${result.errors.join(', ')}`);
        handleCalDAVSettingsChange({
          lastSyncStatus: 'error',
          lastSyncError: result.errors.join(', '),
        });
      }
    } catch (error) {
      setCaldavConnectionMessage(error instanceof Error ? error.message : 'Synchronisation fehlgeschlagen');
      handleCalDAVSettingsChange({
        lastSyncStatus: 'error',
        lastSyncError: error instanceof Error ? error.message : 'Unbekannter Fehler',
      });
    } finally {
      setCaldavIsSyncing(false);
    }
  };

  const handleCalDAVSaveSettings = () => {
    handleCalDAVSettingsChange({
      enabled: caldavEnabled,
      serverUrl: caldavServerUrl,
      username: caldavUsername,
      password: caldavPassword,
      calendarUrl: caldavCalendarUrl,
      autoSync: caldavAutoSync,
      syncInterval: caldavSyncInterval,
      syncOnStart: caldavSyncOnStart,
      syncOnTaskChange: caldavSyncOnTaskChange,
      bidirectionalSync: caldavBidirectionalSync,
      conflictResolution: caldavConflictResolution,
    });
    
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  const priorities = [
    { value: 'none', label: 'Ohne Priorität', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' },
    { value: 'low', label: 'Niedrig', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    { value: 'medium', label: 'Mittel', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
    { value: 'high', label: 'Hoch', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' }
  ];

  // Simple toggle component
  const Toggle = ({ enabled, onChange, disabled = false }: { enabled: boolean; onChange: () => void; disabled?: boolean }) => (
      <button
        onClick={onChange}
      disabled={disabled}
      style={{
        backgroundColor: enabled 
          ? getAccentColorStyles().bg.backgroundColor
          : disabled 
            ? '#9ca3af' 
            : '#d1d5db'
      }}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 ${
        disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:scale-105'
      }`}
    >
      <span
        className="inline-block h-4 w-4 rounded-full bg-white transition-all duration-300 shadow-lg"
        style={{
          transform: enabled ? 'translateX(20px)' : 'translateX(4px)'
        }}
      />
    </button>
  );

  // Filter settings sections based on search query
  const getFilteredSections = () => {
    if (!searchQuery.trim()) return settingsSections;
    
    const query = searchQuery.toLowerCase();
    return settingsSections.filter(section => 
      section.title.toLowerCase().includes(query) ||
      section.description.toLowerCase().includes(query) ||
      section.id.toLowerCase().includes(query)
    );
  };

  // Render different sections
  // Integration tabs configuration
  const integrationTabs = [
    { id: 'simple-apis', title: 'Einfache Sync-Alternativen', icon: Zap, description: 'Export/Import - ohne komplexe OAuth' },
    { id: 'toggl', title: t('settings.integrations.toggl.title'), icon: Play, description: t('settings.integrations.toggl.description') }
  ];

  const [activeDataTab, setActiveDataTab] = useState<string>('data-export');

  const renderIntegrationsSection = () => {
    return (
      <div className="space-y-6">
        {/* Integration Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {integrationTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveIntegrationTab(tab.id)}
                className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeIntegrationTab === tab.id
                    ? 'text-gray-900 dark:text-white border-current'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                style={activeIntegrationTab === tab.id ? { 
                  color: state.preferences.accentColor,
                  borderColor: state.preferences.accentColor
                } : {}}
              >
                <tab.icon className="-ml-0.5 mr-2 h-5 w-5" />
                {tab.title}
              </button>
            ))}
          </nav>
        </div>

        {/* Integration Content */}
        <div className="mt-6">
          {activeIntegrationTab === 'simple-apis' && renderSimpleApisSection()}
          {/* Toggl removed from Integrations; now under Timer & Pomodoro */}
          {activeIntegrationTab === 'ical' && renderICalSection()}
        </div>
      </div>
    );
  };

  const renderTogglSection = () => {
    return (
      <div className="space-y-8">
        {/* Toggl Status Header */}
        <div className="p-6 rounded-lg border" style={{ 
          background: `linear-gradient(135deg, ${state.preferences.accentColor}15, ${state.preferences.accentColor}05)`,
          borderColor: `${state.preferences.accentColor}40`
        }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                togglConnectionStatus === 'success' ? 'bg-green-100 dark:bg-green-900' :
                togglConnectionStatus === 'error' ? 'bg-red-100 dark:bg-red-900' :
                'bg-gray-100 dark:bg-gray-800'
              }`}>
                <Play className={`w-6 h-6 ${
                  togglConnectionStatus === 'success' ? 'text-green-600 dark:text-green-400' :
                  togglConnectionStatus === 'error' ? 'text-red-600 dark:text-red-400' :
                  'text-gray-600 dark:text-gray-400'
                }`} />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Toggl Integration</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Status: {togglConnectionStatus === 'success' ? 'Verbunden' : 
                           togglConnectionStatus === 'error' ? 'Fehler' : 
                           togglConnectionStatus === 'testing' ? 'Wird getestet...' : 'Nicht konfiguriert'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Toggle 
                enabled={togglEnabled} 
                onChange={() => setTogglEnabled(!togglEnabled)} 
              />
            </div>
          </div>
        </div>

        {togglEnabled && (
          <>
            {/* Connection Status */}
            <div className="space-y-4">
              {togglConnectionMessage && (
                <div className={`p-4 rounded-lg border ${
                  togglConnectionStatus === 'success' ? 
                    'bg-green-50 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-800' :
                  togglConnectionStatus === 'error' ? 
                    'bg-red-50 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-800' :
                    'bg-blue-50 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                }`}>
                  {togglConnectionMessage}
                </div>
              )}
            </div>

            {/* Configuration Guide */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Konfiguration</h3>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">i</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                      So konfigurieren Sie Toggl Track:
                    </h4>
                    <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-2 list-decimal list-inside">
                      <li>
                        Besuchen Sie{' '}
                        <a 
                          href="https://track.toggl.com/profile" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="underline hover:text-blue-600 dark:hover:text-blue-300"
                          style={{ color: state.preferences.accentColor }}
                        >
                          Ihr Toggl-Profil
                        </a>{' '}
                        und kopieren Sie Ihren API-Token
                      </li>
                      <li>Fügen Sie den API-Token unten ein und testen Sie die Verbindung</li>
                      <li>Wählen Sie Ihr Workspace aus der Liste</li>
                      <li>Optional: Wählen Sie ein Standard-Projekt für neue Einträge</li>
                      <li>Konfigurieren Sie die Synchronisationsoptionen nach Ihren Wünschen</li>
                    </ol>
                    <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700 space-y-2">
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        <strong>Hinweis:</strong> Alle Timer-Aktionen werden automatisch mit Toggl synchronisiert, 
                        wenn die Integration aktiviert ist. Sie können die Synchronisation für einzelne Aktionen 
                        in den erweiterten Einstellungen anpassen.
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        <strong>Wichtig:</strong> Die Toggl-Integration funktioniert aufgrund von Browser-Sicherheitseinschränkungen (CORS) 
                        möglicherweise nicht vollständig in der Web-Version. Für die beste Erfahrung verwenden Sie die Desktop-Version der App.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* API Configuration */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">API-Konfiguration</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    API-Token
                  </label>
                  <input
                    type="password"
                    value={togglApiToken}
                    onChange={(e) => setTogglApiToken(e.target.value)}
                    placeholder="Toggl API-Token eingeben"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800"
                    style={{ 
                      '--tw-ring-color': state.preferences.accentColor,
                      borderColor: state.preferences.accentColor + '40'
                    } as React.CSSProperties}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Finden Sie Ihren API-Token in Ihrem{' '}
                    <a 
                      href="https://track.toggl.com/profile" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="underline hover:opacity-80"
                      style={{ color: state.preferences.accentColor }}
                    >
                      Toggl-Profil
                    </a>{' '}
                    unter "API Token"
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Workspace
                  </label>
                  <select
                    value={togglWorkspaceId}
                    onChange={(e) => handleTogglWorkspaceChange(e.target.value)}
                    disabled={!togglApiToken || togglWorkspaces.length === 0}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 disabled:opacity-50"
                    style={{ 
                      '--tw-ring-color': state.preferences.accentColor,
                      borderColor: state.preferences.accentColor + '40'
                    } as React.CSSProperties}
                  >
                    <option value="">Workspace auswählen</option>
                    {togglWorkspaces.map((workspace) => (
                      <option key={workspace.id} value={workspace.id}>
                        {workspace.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Standard-Projekt (optional)
                  </label>
                  <select
                    value={togglDefaultProjectId}
                    onChange={(e) => setTogglDefaultProjectId(e.target.value)}
                    disabled={!togglWorkspaceId || togglProjects.length === 0}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 disabled:opacity-50"
                    style={{ 
                      '--tw-ring-color': state.preferences.accentColor,
                      borderColor: state.preferences.accentColor + '40'
                    } as React.CSSProperties}
                  >
                    <option value="">Kein Standard-Projekt</option>
                    {togglProjects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleTogglConnectionTest}
                  disabled={!togglApiToken || togglConnectionStatus === 'testing'}
                  className="px-4 py-2 rounded-md text-white font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  style={{ backgroundColor: state.preferences.accentColor }}
                >
                  {togglConnectionStatus === 'testing' ? (
                    <div className="flex items-center space-x-2">
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Wird getestet...</span>
                    </div>
                  ) : (
                    'Verbindung testen'
                  )}
                </button>
              </div>
            </div>

            {/* Sync Options */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Synchronisation</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Automatische Synchronisation</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Zeiten automatisch an Toggl senden</div>
                  </div>
                  <Toggle 
                    enabled={togglAutoSync} 
                    onChange={() => setTogglAutoSync(!togglAutoSync)} 
                    disabled={!togglEnabled}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Bei Timer-Start synchronisieren</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Timer-Start an Toggl senden</div>
                  </div>
                  <Toggle 
                    enabled={togglSyncOnStart} 
                    onChange={() => setTogglSyncOnStart(!togglSyncOnStart)} 
                    disabled={!togglEnabled}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Bei Timer-Pause synchronisieren</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Timer-Pause an Toggl senden</div>
                  </div>
                  <Toggle 
                    enabled={togglSyncOnPause} 
                    onChange={() => setTogglSyncOnPause(!togglSyncOnPause)} 
                    disabled={!togglEnabled}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Bei Timer-Stopp synchronisieren</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Timer-Stopp an Toggl senden</div>
                  </div>
                  <Toggle 
                    enabled={togglSyncOnStop} 
                    onChange={() => setTogglSyncOnStop(!togglSyncOnStop)} 
                    disabled={!togglEnabled}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Projekte automatisch erstellen</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Neue Projekte automatisch in Toggl erstellen</div>
                  </div>
                  <Toggle 
                    enabled={togglCreateProjects} 
                    onChange={() => setTogglCreateProjects(!togglCreateProjects)} 
                    disabled={!togglEnabled}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Aufgabenbeschreibungen verwenden</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Aufgabentitel als Toggl-Beschreibung verwenden</div>
                  </div>
                  <Toggle 
                    enabled={togglUseTaskDescriptions} 
                    onChange={() => setTogglUseTaskDescriptions(!togglUseTaskDescriptions)} 
                    disabled={!togglEnabled}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Zeit auf Minuten runden</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Zeiten auf volle Minuten runden</div>
                  </div>
                  <Toggle 
                    enabled={togglRoundTime} 
                    onChange={() => setTogglRoundTime(!togglRoundTime)} 
                    disabled={!togglEnabled}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderCalDAVSection = () => {
    return (
      <div className="space-y-8">
        {/* CalDAV Status Header */}
        <div className="p-6 rounded-lg border" style={{ 
          background: `linear-gradient(135deg, ${state.preferences.accentColor}15, ${state.preferences.accentColor}05)`,
          borderColor: `${state.preferences.accentColor}40`
        }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                caldavConnectionStatus === 'success' ? 'bg-green-100 dark:bg-green-900' :
                caldavConnectionStatus === 'error' ? 'bg-red-100 dark:bg-red-900' :
                'bg-gray-100 dark:bg-gray-800'
              }`}>
                <Smartphone className={`w-6 h-6 ${
                  caldavConnectionStatus === 'success' ? 'text-green-600 dark:text-green-400' :
                  caldavConnectionStatus === 'error' ? 'text-red-600 dark:text-red-400' :
                  'text-gray-600 dark:text-gray-400'
                }`} />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">CalDAV Integration</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Status: {caldavConnectionStatus === 'success' ? 'Verbunden' : 
                           caldavConnectionStatus === 'error' ? 'Fehler' : 
                           caldavConnectionStatus === 'testing' ? 'Wird getestet...' : 'Nicht konfiguriert'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Toggle 
                enabled={caldavEnabled} 
                onChange={() => {
                  const newEnabled = !caldavEnabled;
                  setCaldavEnabled(newEnabled);
                  // Sofort speichern
                  handleCalDAVSettingsChange({ enabled: newEnabled });
                }} 
              />
            </div>
          </div>
        </div>

        {caldavEnabled && (
          <>
            {/* 🚨 SUPER VISIBLE CALENDAR SELECTION - INTEGRATION TAB 🚨 */}
            <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 border-4 border-red-500 rounded-lg">
              <h2 className="text-2xl font-bold text-red-800 dark:text-red-200 mb-3 text-center">
                🚨 KALENDERAUSWAHL - INTEGRATION TAB - DEBUGGING 🚨
              </h2>
              <div className="space-y-3">
                <div className="text-sm font-mono bg-white dark:bg-gray-800 p-3 rounded border">
                  <div>🔍 Status: {caldavConnectionStatus || 'undefined'}</div>
                  <div>📊 Loading: {caldavCalendarsLoading ? 'true' : 'false'}</div>
                  <div>📅 Calendars: {caldavCalendars.length}</div>
                  <div>💬 Message: {caldavConnectionMessage || 'keine'}</div>
                  <div>✅ Selected: {caldavCalendarUrl || 'keiner'}</div>
                </div>
                
                {caldavCalendars.length > 0 ? (
                  <div>
                    <div className="font-bold text-green-800 dark:text-green-200 mb-2 text-lg">
                      📅 GEFUNDENE KALENDER ({caldavCalendars.length}):
                    </div>
                    <div className="space-y-2">
                      {caldavCalendars.map((calendar, index) => (
                        <label key={calendar.url} className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 rounded border-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <input
                            type="radio"
                            name="integration-calendar-selection"
                            value={calendar.url}
                            checked={caldavCalendarUrl === calendar.url}
                            onChange={(e) => {
                              console.log('🔥 INTEGRATION CALENDAR SELECTED:', e.target.value);
                              setCaldavCalendarUrl(e.target.value);
                            }}
                            className="w-6 h-6 text-red-600"
                          />
                          <div className="flex-1">
                            <div className="font-bold text-gray-900 dark:text-white text-lg">
                              {index + 1}. {calendar.displayName}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              URL: {calendar.url}
                            </div>
                            <div className="text-sm text-blue-600 dark:text-blue-400">
                              {calendar.todoCount !== undefined ? `${calendar.todoCount} Todos` : 'Todo-Anzahl unbekannt'}
                            </div>
                          </div>
                          {caldavCalendarUrl === calendar.url && (
                            <span className="text-green-600 font-bold text-xl">✅ AUSGEWÄHLT</span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-red-800 dark:text-red-200 font-bold text-lg text-center p-4 bg-yellow-100 dark:bg-yellow-900 rounded">
                    ❌ KEINE KALENDER GEFUNDEN - Teste zuerst die Verbindung!
                  </div>
                )}

                {/* Photo Credits Modal was moved to the global modal section below */}
              </div>
            </div>

            {/* Connection Status */}
            <div className="space-y-4">
              {caldavConnectionMessage && (
                <div className={`p-4 rounded-lg border ${
                  caldavConnectionStatus === 'success' ? 
                    'bg-green-50 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-800' :
                  caldavConnectionStatus === 'error' ? 
                    'bg-red-50 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-800' :
                    'bg-blue-50 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                }`}>
                  {caldavConnectionMessage}
                </div>
              )}
              
              {caldavIsSyncing && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center space-x-3">
                    <Loader className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Synchronisation läuft...
                      </div>
                      <div className="text-xs text-blue-700 dark:text-blue-300">
                        Fortschritt: {Math.round(caldavSyncProgress)}%
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                    <div 
                      className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${caldavSyncProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* Configuration Guide */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Konfiguration</h3>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">i</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                      So konfigurieren Sie CalDAV:
                    </h4>
                    <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-2 list-decimal list-inside">
                      <li>Geben Sie die Server-URL Ihres CalDAV-Servers ein (z.B. Nextcloud)</li>
                      <li>Tragen Sie Ihre Anmeldedaten ein</li>
                      <li>Geben Sie die URL Ihres Kalenders ein</li>
                      <li>Testen Sie die Verbindung</li>
                      <li>Konfigurieren Sie die Synchronisationsoptionen</li>
                    </ol>
                    <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        <strong>Hinweis:</strong> TaskFuchs synchronisiert Ihre Aufgaben bidirektional mit Ihrem CalDAV-Kalender. 
                        Änderungen werden automatisch zwischen TaskFuchs und Ihrem Kalender synchronisiert.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Server Configuration */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Server-Konfiguration</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Server-URL
                  </label>
                  <input
                    type="url"
                    value={caldavServerUrl}
                    onChange={(e) => setCaldavServerUrl(e.target.value)}
                    placeholder="https://nextcloud.example.com"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800"
                    style={{ 
                      '--tw-ring-color': state.preferences.accentColor,
                      borderColor: state.preferences.accentColor + '40'
                    } as React.CSSProperties}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Die Basis-URL Ihres CalDAV-Servers (z.B. Nextcloud, iCloud, Google)
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Benutzername
                    </label>
                    <input
                      type="text"
                      value={caldavUsername}
                      onChange={(e) => setCaldavUsername(e.target.value)}
                      placeholder="Ihr Benutzername"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800"
                      style={{ 
                        '--tw-ring-color': state.preferences.accentColor,
                        borderColor: state.preferences.accentColor + '40'
                      } as React.CSSProperties}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Passwort
                    </label>
                    <input
                      type="password"
                      value={caldavPassword}
                      onChange={(e) => setCaldavPassword(e.target.value)}
                      placeholder="Ihr Passwort oder App-Passwort"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800"
                      style={{ 
                        '--tw-ring-color': state.preferences.accentColor,
                        borderColor: state.preferences.accentColor + '40'
                      } as React.CSSProperties}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Kalender-URL
                  </label>
                  <input
                    type="url"
                    value={caldavCalendarUrl}
                    onChange={(e) => setCaldavCalendarUrl(e.target.value)}
                    placeholder="https://nextcloud.example.com/remote.php/dav/calendars/username/calendar-name/"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800"
                    style={{ 
                      '--tw-ring-color': state.preferences.accentColor,
                      borderColor: state.preferences.accentColor + '40'
                    } as React.CSSProperties}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Die direkte URL zu Ihrem Kalender (optional - wird automatisch erkannt wenn leer)
                  </p>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={handleCalDAVConnectionTest}
                    disabled={!caldavServerUrl || !caldavUsername || !caldavPassword || caldavConnectionStatus === 'testing'}
                    className="px-4 py-2 rounded-md text-white font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    style={{ backgroundColor: state.preferences.accentColor }}
                  >
                    {caldavConnectionStatus === 'testing' ? (
                      <div className="flex items-center space-x-2">
                        <Loader className="w-4 h-4 animate-spin" />
                        <span>Wird getestet...</span>
                      </div>
                    ) : (
                      'Verbindung testen'
                    )}
                  </button>

                  <button
                    onClick={handleCalDAVSync}
                    disabled={!caldavEnabled || caldavConnectionStatus !== 'success' || caldavIsSyncing}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {caldavIsSyncing ? (
                      <div className="flex items-center space-x-2">
                        <Loader className="w-4 h-4 animate-spin" />
                        <span>Synchronisiert...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <RefreshCw className="w-4 h-4" />
                        <span>Jetzt synchronisieren</span>
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Sync Options */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Synchronisation</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Automatische Synchronisation</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Automatisch alle X Minuten synchronisieren</div>
                  </div>
                  <Toggle 
                    enabled={caldavAutoSync} 
                    onChange={() => setCaldavAutoSync(!caldavAutoSync)} 
                    disabled={!caldavEnabled}
                  />
                </div>

                {caldavAutoSync && (
                  <div className="space-y-4 pl-4 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center space-x-2 text-blue-700 dark:text-blue-300">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium">Auto-Sync aktiviert</span>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Synchronisationsintervall
                      </label>
                      <select
                        value={caldavSyncInterval}
                        onChange={(e) => setCaldavSyncInterval(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800"
                        style={{ 
                          '--tw-ring-color': state.preferences.accentColor,
                          borderColor: state.preferences.accentColor + '40'
                        } as React.CSSProperties}
                      >
                        <option value={5}>Alle 5 Minuten ⚡</option>
                        <option value={15}>Alle 15 Minuten</option>
                        <option value={30}>Alle 30 Minuten (Standard)</option>
                        <option value={60}>Jede Stunde</option>
                        <option value={120}>Alle 2 Stunden</option>
                        <option value={360}>Alle 6 Stunden</option>
                        <option value={720}>Alle 12 Stunden</option>
                        <option value={1440}>Täglich</option>
                      </select>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        💡 Niedrigere Intervalle bedeuten häufigere Sync-Vorgänge, aber auch mehr Netzwerk-Traffic
                      </p>
                    </div>

                    {state.preferences.caldav?.lastSync && (
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            state.preferences.caldav.lastSyncStatus === 'success' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {state.preferences.caldav.lastSyncStatus === 'success' ? '✅ Erfolgreich' : '❌ Fehler'}
                          </span>
                          <span>
                            Letzte Sync: {new Date(state.preferences.caldav.lastSync).toLocaleString('de-DE')}
                          </span>
                        </div>
                        {state.preferences.caldav.lastSyncError && (
                          <div className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                            {state.preferences.caldav.lastSyncError}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Bei App-Start synchronisieren</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Automatisch beim Öffnen der App synchronisieren</div>
                  </div>
                  <Toggle 
                    enabled={caldavSyncOnStart} 
                    onChange={() => setCaldavSyncOnStart(!caldavSyncOnStart)} 
                    disabled={!caldavEnabled}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Bei Aufgaben-Änderung synchronisieren</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Sofort synchronisieren wenn Aufgaben geändert werden</div>
                  </div>
                  <Toggle 
                    enabled={caldavSyncOnTaskChange} 
                    onChange={() => setCaldavSyncOnTaskChange(!caldavSyncOnTaskChange)} 
                    disabled={!caldavEnabled}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Bidirektionale Synchronisation</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Änderungen in beide Richtungen synchronisieren</div>
                  </div>
                  <Toggle 
                    enabled={caldavBidirectionalSync} 
                    onChange={() => setCaldavBidirectionalSync(!caldavBidirectionalSync)} 
                    disabled={!caldavEnabled}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Konfliktlösung
                  </label>
                  <select
                    value={caldavConflictResolution}
                    onChange={(e) => setCaldavConflictResolution(e.target.value as 'local' | 'remote' | 'manual')}
                    disabled={!caldavEnabled}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 disabled:opacity-50"
                    style={{ 
                      '--tw-ring-color': state.preferences.accentColor,
                      borderColor: state.preferences.accentColor + '40'
                    } as React.CSSProperties}
                  >
                    <option value="local">Lokale Änderungen bevorzugen</option>
                    <option value="remote">Server-Änderungen bevorzugen</option>
                    <option value="manual">Manuell entscheiden</option>
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Wie sollen Konflikte bei der Synchronisation behandelt werden?
                  </p>
                </div>
              </div>
            </div>

            {/* Troubleshooting */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Fehlerbehebung</h3>
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <h4 className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-3">
                  Häufige Probleme und Lösungen:
                </h4>
                <ul className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-amber-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                    <div>
                      <strong>CORS-Fehler:</strong> Browser blockiert Anfrage. Verwenden Sie ein App-Passwort in Nextcloud oder aktivieren Sie CORS für Ihren Server.
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-amber-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                    <div>
                      <strong>SSL-Zertifikat-Fehler:</strong> Selbst-signierte Zertifikate können in Browsern blockiert werden. Akzeptieren Sie das Zertifikat manuell im Browser.
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-amber-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                    <div>
                      <strong>Authentifizierung fehlgeschlagen:</strong> Überprüfen Sie Benutzername und Passwort. Verwenden Sie ein App-Passwort statt des Hauptpassworts.
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-amber-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                    <div>
                      <strong>Server nicht erreichbar:</strong> Stellen Sie sicher, dass die Server-URL korrekt ist und HTTPS verwendet wird.
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-amber-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                    <div>
                      <strong>Timeout-Fehler:</strong> Überprüfen Sie Ihre Internetverbindung und Firewall-Einstellungen.
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-amber-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                    <div>
                      <strong>Keine Kalender gefunden:</strong> Stellen Sie sicher, dass in Nextcloud die Kalender-App aktiviert ist.
                    </div>
                  </li>
                </ul>

                <div className="border-t border-amber-200 dark:border-amber-800 pt-3 mt-3">
                  <div className="font-medium text-amber-900 dark:text-amber-100 mb-2">
                    Typische Nextcloud-URLs:
                  </div>
                  <div className="space-y-1 text-amber-800 dark:text-amber-200 font-mono text-xs">
                    <div>• https://ihr-server.com/nextcloud</div>
                    <div>• https://nextcloud.example.com</div>
                    <div>• https://cloud.example.com</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleCalDAVSaveSettings}
                className="px-6 py-2 rounded-md text-white font-medium transition-all duration-200 hover:scale-105"
                style={{ backgroundColor: state.preferences.accentColor }}
              >
                Einstellungen speichern
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderICalSection = () => {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="p-6 rounded-lg border" style={{ 
          background: `linear-gradient(135deg, ${state.preferences.accentColor}15, ${state.preferences.accentColor}05)`,
          borderColor: `${state.preferences.accentColor}40`
        }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  iCal Import
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Importiere Kalender über iCal-URLs (z.B. Google Calendar, Outlook)
                </p>
              </div>
            </div>
            <Toggle enabled={icalEnabled} onChange={() => {
              const newEnabled = !icalEnabled;
              setIcalEnabled(newEnabled);
              dispatch({ 
                type: 'UPDATE_PREFERENCES', 
                payload: { 
                  calendars: { 
                    ...state.preferences.calendars,
                    showInPlanner: newEnabled 
                  } 
                } 
              });
            }} />
          </div>
        </div>

        {icalEnabled && (
          <>
            {/* Add Calendar Source */}
            <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="text-base font-medium text-gray-900 dark:text-white mb-4">
                Neuen Kalender hinzufügen
              </h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Kalender-Name
                  </label>
                  <input
                    type="text"
                    value={newIcalName}
                    onChange={(e) => setNewIcalName(e.target.value)}
                    placeholder="z.B. Mein Google Kalender"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2"
                    style={{ '--tw-ring-color': state.preferences.accentColor } as any}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    iCal-URL
                  </label>
                  <input
                    type="url"
                    value={newIcalUrl}
                    onChange={(e) => {
                      setNewIcalUrl(e.target.value);
                      // Clear previous test results when URL changes
                      setIcalErrors({});
                      setIcalTestResults({});
                    }}
                    placeholder="https://calendar.google.com/calendar/ical/..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2"
                    style={{ '--tw-ring-color': state.preferences.accentColor } as any}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Google Calendar: Einstellungen → Kalender teilen → Geheime Adresse im iCal-Format
                  </p>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={async () => {
                      if (!newIcalUrl.trim()) return;
                      
                      setIcalTestingUrl(newIcalUrl);
                      setIcalErrors({});
                      setIcalTestResults({});
                      
                      try {
                        const result = await ICalService.getInstance().testCalendarUrl(newIcalUrl);
                        if (result.success) {
                          // Test successful
                          setIcalTestResults({ 
                            [newIcalUrl]: { 
                              success: true, 
                              message: 'Verbindung erfolgreich! Kalender ist erreichbar.' 
                            } 
                          });
                          setIcalErrors({});
                        } else {
                          setIcalErrors({ [newIcalUrl]: result.error || 'Unbekannter Fehler' });
                          setIcalTestResults({});
                        }
                      } catch (error) {
                        setIcalErrors({ [newIcalUrl]: error.message });
                        setIcalTestResults({});
                      } finally {
                        setIcalTestingUrl(null);
                      }
                    }}
                    disabled={!newIcalUrl.trim() || icalTestingUrl === newIcalUrl}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    {icalTestingUrl === newIcalUrl ? (
                      <span className="flex items-center space-x-2">
                        <Loader className="w-4 h-4 animate-spin" />
                        <span>Teste...</span>
                      </span>
                    ) : (
                      'URL testen'
                    )}
                  </button>
                  
                  <button
                    onClick={() => {
                      if (!newIcalName.trim() || !newIcalUrl.trim()) return;
                      
                      const colors = ICalService.getDefaultColors();
                      const newSource: CalendarSource = {
                        id: Date.now().toString(),
                        name: newIcalName.trim(),
                        url: newIcalUrl.trim(),
                        color: colors[icalSources.length % colors.length],
                        enabled: true,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                      };
                      
                      const updatedSources = [...icalSources, newSource];
                      setIcalSources(updatedSources);
                      dispatch({ type: 'ADD_CALENDAR_SOURCE', payload: newSource });
                      
                      // Clear form
                      setNewIcalName('');
                      setNewIcalUrl('');
                      setIcalErrors({});
                      setIcalTestResults({});
                      
                      setShowSaved(true);
                      setTimeout(() => setShowSaved(false), 2000);
                    }}
                    disabled={!newIcalName.trim() || !newIcalUrl.trim()}
                    className="px-4 py-2 rounded-lg text-white font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    style={{ backgroundColor: state.preferences.accentColor }}
                  >
                    Kalender hinzufügen
                  </button>
                </div>
                
                {/* Test Results */}
                {icalErrors[newIcalUrl] && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">
                    ❌ {icalErrors[newIcalUrl]}
                  </div>
                )}
                
                {icalTestResults[newIcalUrl]?.success && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-800 dark:text-green-200">
                    ✅ {icalTestResults[newIcalUrl].message}
                  </div>
                )}
              </div>
            </div>

            {/* Existing Calendar Sources */}
            {icalSources.length > 0 && (
              <div>
                <h4 className="text-base font-medium text-gray-900 dark:text-white mb-4">
                  Konfigurierte Kalender ({icalSources.length})
                </h4>
                
                <div className="space-y-3">
                  {icalSources.map((source, index) => (
                    <div key={source.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div 
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: source.color }}
                          ></div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 dark:text-white truncate">
                              {source.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {source.url}
                            </div>
                            <div className="text-xs text-gray-400">
                              {source.lastSync ? (
                                <>Letzte Sync: {new Date(source.lastSync).toLocaleString('de-DE')}</>
                              ) : (
                                <span className="text-gray-400">Noch nicht synchronisiert</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <button
                            onClick={async () => {
                              setIcalSyncingSource(source.id);
                              setIcalErrors({});
                              
                              try {
                                const events = await ICalService.getInstance().fetchCalendar(source);
                                dispatch({ type: 'SYNC_EVENTS', payload: { events, sourceId: source.id } });
                                
                                // Update last sync time
                                const updatedSource = { ...source, lastSync: new Date().toISOString() };
                                setIcalSources(prev => prev.map(s => s.id === source.id ? updatedSource : s));
                                dispatch({ type: 'UPDATE_CALENDAR_SOURCE', payload: updatedSource });
                              } catch (error) {
                                setIcalErrors({ [source.id]: error.message });
                              } finally {
                                setIcalSyncingSource(null);
                              }
                            }}
                            disabled={icalSyncingSource === source.id}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
                            title="Synchronisieren"
                          >
                            {icalSyncingSource === source.id ? (
                              <Loader className="w-4 h-4 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={async () => {
                              setIcalTestingUrl(source.url);
                              setIcalErrors({});
                              
                              try {
                                const result = await ICalService.getInstance().testCalendarUrl(source.url);
                                if (!result.success) {
                                  setIcalErrors({ [source.id]: result.error || 'Unbekannter Fehler' });
                                } else {
                                  // Remove any previous errors for this source
                                  setIcalErrors(prev => {
                                    const newErrors = { ...prev };
                                    delete newErrors[source.id];
                                    return newErrors;
                                  });
                                }
                              } catch (error) {
                                setIcalErrors({ [source.id]: error.message });
                              } finally {
                                setIcalTestingUrl(null);
                              }
                            }}
                            disabled={icalTestingUrl === source.url}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
                            title="Kalender testen"
                          >
                            {icalTestingUrl === source.url ? (
                              <Loader className="w-4 h-4 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4" />
                            )}
                          </button>
                          
                          <Toggle 
                            enabled={source.enabled} 
                            onChange={() => {
                              const updatedSource = { ...source, enabled: !source.enabled, updatedAt: new Date().toISOString() };
                              const updatedSources = icalSources.map(s => s.id === source.id ? updatedSource : s);
                              setIcalSources(updatedSources);
                              dispatch({ type: 'UPDATE_CALENDAR_SOURCE', payload: updatedSource });
                            }} 
                          />
                          
                          <button
                            onClick={() => {
                              const updatedSources = icalSources.filter(s => s.id !== source.id);
                              setIcalSources(updatedSources);
                                                             dispatch({ type: 'DELETE_CALENDAR_SOURCE', payload: source.id });
                               
                               // Remove any errors for this source
                               setIcalErrors(prev => {
                                 const newErrors = { ...prev };
                                 delete newErrors[source.id];
                                 return newErrors;
                               });
                            }}
                            className="p-2 text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
                            title="Kalender entfernen"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Error Display */}
                      {icalErrors[source.id] && (
                        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">
                          ❌ {icalErrors[source.id]}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Sync All Button */}
                {icalSources.length > 0 && (
                  <div className="flex justify-center">
                    <button
                      onClick={async () => {
                        for (const source of icalSources.filter(s => s.enabled)) {
                          setIcalSyncingSource(source.id);
                          try {
                            const events = await ICalService.getInstance().fetchCalendar(source);
                            dispatch({ type: 'SYNC_EVENTS', payload: { events, sourceId: source.id } });
                            
                            const updatedSource = { ...source, lastSync: new Date().toISOString() };
                            setIcalSources(prev => prev.map(s => s.id === source.id ? updatedSource : s));
                            dispatch({ type: 'UPDATE_CALENDAR_SOURCE', payload: updatedSource });
                          } catch (error) {
                            setIcalErrors(prev => ({ ...prev, [source.id]: error.message }));
                          }
                        }
                        setIcalSyncingSource(null);
                      }}
                      disabled={icalSyncingSource !== null}
                      className="px-6 py-2 text-white rounded-lg transition-colors disabled:opacity-50"
                      style={{ backgroundColor: state.preferences.accentColor }}
                    >
                      {icalSyncingSource ? (
                        <span className="flex items-center space-x-2">
                          <Loader className="w-4 h-4 animate-spin" />
                          <span>Synchronisiere alle...</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-2">
                          <Download className="w-4 h-4" />
                          <span>Alle synchronisieren</span>
                        </span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Configuration Guide */}
            <div>
              <h4 className="text-base font-medium text-gray-900 dark:text-white mb-4">
                Anleitung für beliebte Kalender-Dienste
              </h4>
              
              <div className="space-y-4">
                {/* Google Calendar */}
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <h5 className="font-medium text-gray-900 dark:text-white mb-2">Google Calendar</h5>
                  <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
                    <li>Öffnen Sie Google Calendar</li>
                    <li>Klicken Sie auf die drei Punkte neben Ihrem Kalender → "Einstellungen und Freigabe"</li>
                    <li>Scrollen Sie zu "Kalender integrieren" → "Geheime Adresse im iCal-Format"</li>
                    <li>Kopieren Sie die URL und fügen Sie sie hier ein</li>
                  </ol>
                </div>
                
                {/* Outlook Calendar */}
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <h5 className="font-medium text-gray-900 dark:text-white mb-2">Outlook Calendar</h5>
                  <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
                    <li>Öffnen Sie Outlook im Web</li>
                    <li>Gehen Sie zu Kalender → Kalender hinzufügen → "Aus dem Internet"</li>
                    <li>Kopieren Sie die ICS-URL Ihres Kalenders</li>
                    <li>Fügen Sie die URL hier ein</li>
                  </ol>
                </div>
                
                {/* Apple iCloud */}
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <h5 className="font-medium text-gray-900 dark:text-white mb-2">Apple iCloud Calendar</h5>
                  <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
                    <li>Öffnen Sie iCloud.com → Kalender</li>
                    <li>Klicken Sie auf das Freigabe-Symbol neben Ihrem Kalender</li>
                    <li>Aktivieren Sie "Öffentlicher Kalender"</li>
                    <li>Kopieren Sie die URL und fügen Sie sie hier ein</li>
                  </ol>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  // Todoist helper functions
  const testTodoistConnection = async () => {
    if (!todoistApiToken.trim()) {
      setTodoistConnectionStatus('error');
      setTodoistConnectionMessage('Bitte geben Sie einen API-Token ein');
      return;
    }

    setIsTodoistTesting(true);
    setTodoistConnectionStatus('testing');
    setTodoistConnectionMessage('Verbindung wird getestet...');

    try {
      const { todoistService } = await import('../../utils/todoistService');
      
      // Update preferences temporarily for testing
      todoistService.updatePreferences({
        ...state.preferences,
        todoist: {
          ...state.preferences.todoist,
          apiToken: todoistApiToken,
          enabled: true
        }
      });

      const result = await todoistService.testConnection();
      
      if (result.success) {
        setTodoistConnectionStatus('success');
        setTodoistConnectionMessage(result.message);
        
        // Load projects if connection successful
        try {
          setIsLoadingTodoistProjects(true);
          const projects = await todoistService.getProjects();
          setTodoistProjects(projects);
        } catch (error) {
          console.warn('Could not load projects:', error);
        } finally {
          setIsLoadingTodoistProjects(false);
        }
      } else {
        setTodoistConnectionStatus('error');
        setTodoistConnectionMessage(result.message);
      }
    } catch (error) {
      setTodoistConnectionStatus('error');
      setTodoistConnectionMessage(error instanceof Error ? error.message : 'Verbindungstest fehlgeschlagen');
    } finally {
      setIsTodoistTesting(false);
    }
  };

  const saveTodoistSettings = () => {
    const selectedProject = todoistProjects.find(p => 
      document.querySelector(`input[name="todoist-project"]:checked`)?.getAttribute('value') === p.id
    );
    
    const updatedSettings = {
      ...state.preferences.todoist,
      enabled: todoistEnabled,
      apiToken: todoistApiToken,
      syncTags: todoistSyncTags,
      defaultProjectId: selectedProject?.id || state.preferences.todoist?.defaultProjectId || '',
      autoSync: true,
      syncInterval: 30,
      syncOnStart: true,
      syncOnTaskChange: true,
      bidirectionalSync: true,
      syncCompletedTasks: false,
      conflictResolution: 'manual' as const,
    };
    
    dispatch({
      type: 'UPDATE_PREFERENCES',
      payload: {
        todoist: updatedSettings
      }
    });
    
    // Update the TodoistService with new preferences
    import('../../utils/todoistService').then(({ todoistService }) => {
      todoistService.updatePreferences({
        ...state.preferences,
        todoist: updatedSettings
      });
    });
    
    console.log('💾 Todoist settings saved:', {
      enabled: todoistEnabled,
      apiToken: todoistApiToken ? '***' + todoistApiToken.slice(-4) : '',
      syncTags: todoistSyncTags,
      defaultProjectId: selectedProject?.id || 'none',
      projectName: selectedProject?.name || 'none'
    });
    
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  const addTodoistSyncTag = (newTag: string) => {
    if (newTag.trim() && !todoistSyncTags.includes(newTag.trim().toLowerCase())) {
      setTodoistSyncTags([...todoistSyncTags, newTag.trim().toLowerCase()]);
    }
  };

  const removeTodoistSyncTag = (tagToRemove: string) => {
    setTodoistSyncTags(todoistSyncTags.filter(tag => tag !== tagToRemove));
  };

  const manualTodoistSync = async () => {
    if (!todoistEnabled || !todoistApiToken.trim()) {
      setTodoistSyncStatus('error');
      setTodoistSyncMessage('Todoist nicht konfiguriert. Bitte API-Token eingeben und Verbindung testen.');
      return;
    }

    setTodoistSyncStatus('running');
    setTodoistSyncMessage('Synchronisation wird gestartet...');
    setTodoistSyncProgress(0);

    try {
      const { todoistService } = await import('../../utils/todoistService');
      
      // Update service with current preferences
      todoistService.updatePreferences({
        ...state.preferences,
        todoist: {
          ...state.preferences.todoist,
          enabled: todoistEnabled,
          apiToken: todoistApiToken,
          syncTags: todoistSyncTags,
        }
      });

      setTodoistSyncProgress(20);
      setTodoistSyncMessage('Lokale Aufgaben werden gefiltert...');

      // Filter tasks that should be synced
      const syncableTasks = state.tasks.filter(task => {
        return todoistSyncTags.some(syncTag => 
          task.tags.some(taskTag => 
            taskTag.toLowerCase().replace(/^[#@]/, '') === syncTag.toLowerCase().replace(/^[#@]/, '')
          )
        );
      });

      setTodoistSyncProgress(40);
      setTodoistSyncMessage(`${syncableTasks.length} Aufgaben gefunden. Synchronisierung läuft...`);

      // Perform sync
              const result = await todoistService.syncTasks(state.tasks, state.archivedTasks);

      setTodoistSyncProgress(80);
      setTodoistSyncMessage('Lokale Aufgaben werden aktualisiert...');

      // Create missing date columns for imported tasks
      const neededDateColumns = new Set<string>();
      if (result.localTasksToAdd && result.localTasksToAdd.length > 0) {
        result.localTasksToAdd.forEach(task => {
          if (task.columnId?.startsWith('date-')) {
            neededDateColumns.add(task.columnId);
          }
        });
      }
      if (result.localTasksToUpdate && result.localTasksToUpdate.length > 0) {
        result.localTasksToUpdate.forEach(task => {
          if (task.columnId?.startsWith('date-')) {
            neededDateColumns.add(task.columnId);
          }
        });
      }

      // Create missing columns
      const existingColumns = new Set(state.columns.map(col => col.id));
      neededDateColumns.forEach(columnId => {
        if (!existingColumns.has(columnId)) {
          const dateStr = columnId.replace('date-', '');
          const date = new Date(dateStr + 'T00:00:00');
          const formattedTitle = date.toLocaleDateString('de-DE', {
            weekday: 'long',
            day: '2-digit',
            month: '2-digit'
          });
          
          dispatch({
            type: 'ADD_COLUMN',
            payload: {
              id: columnId,
              title: formattedTitle,
              type: 'date' as const,
              order: state.columns.length,
              tasks: [],
              date: dateStr
            }
          });
          console.log(`📅 Created new date column: ${columnId} (${formattedTitle})`);
        }
      });

      // Add new tasks from Todoist to local state
      if (result.localTasksToAdd && result.localTasksToAdd.length > 0) {
        result.localTasksToAdd.forEach(task => {
          dispatch({
            type: 'ADD_TASK',
            payload: task
          });
        });
      }

      // Update existing local tasks with Todoist changes
      if (result.localTasksToUpdate && result.localTasksToUpdate.length > 0) {
        result.localTasksToUpdate.forEach(task => {
          dispatch({
            type: 'UPDATE_TASK',
            payload: task
          });
        });
      }
      
      // Update local tasks with Todoist IDs and sync status
      if (result.localTasksToSync && result.localTasksToSync.length > 0) {
        result.localTasksToSync.forEach(task => {
          dispatch({
            type: 'UPDATE_TASK',
            payload: task
          });
        });
        console.log(`🔗 Updated ${result.localTasksToSync.length} local tasks with Todoist IDs`);
      }

      setTodoistSyncProgress(100);
      setTodoistSyncStatus('success');
      
      const localChanges = (result.localTasksToAdd?.length || 0) + (result.localTasksToUpdate?.length || 0);
      const columnsCreated = neededDateColumns.size - Array.from(neededDateColumns).filter(col => existingColumns.has(col)).length;
      const resultMessage = `Synchronisation erfolgreich! Todoist: ${result.created} erstellt, ${result.updated} aktualisiert. Lokal: ${localChanges} Aufgaben importiert/aktualisiert${columnsCreated > 0 ? `, ${columnsCreated} Datumsspalten erstellt` : ''}`;
      setTodoistSyncMessage(resultMessage);
      
      // Store last sync result
      setTodoistLastSyncResult({
        timestamp: new Date().toISOString(),
        syncableTasks: syncableTasks.length,
        created: result.created,
        updated: result.updated,
        localImported: localChanges,
        errors: result.errors,
      });

      // Update preferences with last sync info
      dispatch({
        type: 'UPDATE_PREFERENCES',
        payload: {
          todoist: {
            ...state.preferences.todoist,
            lastSync: new Date().toISOString(),
            lastSyncStatus: 'success',
            lastSyncError: undefined,
          }
        }
      });

      // Show success for 3 seconds
      setTimeout(() => {
        setTodoistSyncStatus('idle');
        setTodoistSyncProgress(0);
      }, 3000);

    } catch (error) {
      setTodoistSyncStatus('error');
      setTodoistSyncProgress(0);
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      setTodoistSyncMessage(`Synchronisation fehlgeschlagen: ${errorMessage}`);
      
      // Update preferences with error info
      dispatch({
        type: 'UPDATE_PREFERENCES',
        payload: {
          todoist: {
            ...state.preferences.todoist,
            lastSyncStatus: 'error',
            lastSyncError: errorMessage,
          }
        }
      });

      console.error('Todoist sync error:', error);
    }
  };

  const renderTodoistSection = () => {
    // Conflict resolution handler
    const handleConflictResolution = async (resolutions: { [taskId: string]: 'local' | 'remote' | 'merge' | 'skip' }) => {
      try {
        console.log('🔄 Applying conflict resolutions:', resolutions);
        
        // Apply the resolutions
        for (const [taskId, resolution] of Object.entries(resolutions)) {
          const conflict = todoistConflicts.find(c => c.taskId === taskId);
          if (!conflict) continue;

          switch (resolution) {
            case 'local':
              // Keep TaskFuchs version, update Todoist
              console.log(`📝 Keeping TaskFuchs version for task ${taskId}`);
              // TODO: Implement local version application
              break;
            case 'remote':
              // Keep Todoist version, update TaskFuchs
              console.log(`☁️ Keeping Todoist version for task ${taskId}`);
              const updatedTask = { ...conflict.localData.task, ...conflict.remoteData.task };
              dispatch({ type: 'UPDATE_TASK', payload: updatedTask });
              break;
            case 'merge':
              // Manual merge - for now, we'll default to local
              console.log(`🔀 Manual merge requested for task ${taskId} - defaulting to local`);
              break;
            case 'skip':
              // Skip this conflict
              console.log(`⏭️ Skipping conflict for task ${taskId}`);
              break;
          }
        }

        // Close conflict resolution modal
        setConflictResolutionOpen(false);
        setTodoistConflicts([]);
        
        // Show success message
        setNewTodoistSyncStatus('success');
        setNewTodoistSyncMessage(`Konflikte aufgelöst. ${Object.keys(resolutions).length} Aufgabe(n) verarbeitet.`);
        
      } catch (error) {
        console.error('❌ Error resolving conflicts:', error);
        setNewTodoistSyncStatus('error');
        setNewTodoistSyncMessage(`Fehler beim Auflösen der Konflikte: ${error}`);
      }
    };

    // Manual sync function with optional force full sync
    const performManualSync = async (forceFullSync = false) => {
      if (!newTodoistSyncConfig?.enabled) {
        setNewTodoistSyncStatus('error');
        setNewTodoistSyncMessage('Todoist-Synchronisation ist nicht aktiviert. Bitte konfigurieren Sie die Synchronisation.');
        return;
      }

      setNewTodoistSyncStatus('running');
      setNewTodoistSyncMessage('Synchronisation wird gestartet...');
      setSyncProgress(0);
      setSyncStep('Wird initialisiert...');
      setSyncErrors([]);

                            try {
          // Simulate progress updates during sync
          const progressInterval = setInterval(() => {
            setSyncProgress(prev => Math.min(prev + Math.random() * 20, 90));
          }, 300);
          
          // Set various sync steps
          setSyncStep('Verbindung zu Todoist...');
          setTimeout(() => setSyncStep('Projekte und Spalten synchronisieren...'), 500);
          setTimeout(() => setSyncStep('Aufgaben vergleichen...'), 1200);
          setTimeout(() => setSyncStep('Änderungen übertragen...'), 2000);
          
          const result = await todoistSyncManager.performSync(state.tasks, state.viewState.projectKanban.columns, forceFullSync);
          
          clearInterval(progressInterval);
          setSyncProgress(100);
          setSyncStep('Abgeschlossen');
        
        // Check for conflicts that need user resolution
        if (result.conflicts && result.conflicts.length > 0) {
          setNewTodoistSyncStatus('idle');
          setNewTodoistSyncMessage(`${result.conflicts.length} Konflikt(e) erkannt - Benutzerentscheidung erforderlich`);
          setTodoistConflicts(result.conflicts);
          setConflictResolutionOpen(true);
          return;
        }
        
        if (result.success) {
            setNewTodoistSyncStatus('success');
            setNewTodoistSyncMessage(result.summary);
            setNewTodoistSyncResult(result);
            setSyncErrors(result.errors || []);
            
            // Update timestamps
            const config = todoistSyncManager.getConfig();
            if (config?.lastSyncState) {
              setLastSyncTimestamp(config.lastSyncState.timestamp || null);
              setLastFullSyncTimestamp(config.lastSyncState.lastFullSyncTimestamp || null);
            }
            
            // Add new columns if any were created during sync (as ProjectKanbanColumns)
            if (result.localColumnsAdded.length > 0) {
              result.localColumnsAdded.forEach(column => {
                // Convert Column to ProjectKanbanColumn for project-specific Kanban boards
                if (column.projectId && (column.type === 'date' || column.type === 'project')) {
                  dispatch({ 
                    type: 'ADD_PROJECT_KANBAN_COLUMN_WITH_ID', 
                    payload: {
                      id: column.id,
                      projectId: column.projectId,
                      title: column.title || 'Neue Spalte',
                                             color: state.preferences.accentColor || '#0ea5e9', // Use accent color for sync-created columns
                      order: column.order || 0
                    }
                  });
                }
              });
              console.log(`📂 Added ${result.localColumnsAdded.length} new PROJECT KANBAN columns via manual sync`);
            }
            
            // Update local tasks if needed
            if (result.localTasksAdded.length > 0 || result.localTasksUpdated.length > 0 || result.localTasksDeleted.length > 0) {
              // Dispatch updates to app context
              result.localTasksAdded.forEach(task => {
                dispatch({ type: 'ADD_TASK', payload: task });
              });
              
              result.localTasksUpdated.forEach(task => {
                dispatch({ type: 'UPDATE_TASK', payload: task });
              });
              
              // Handle deletions - these are TaskFuchs task IDs that should be deleted
              result.localTasksDeleted.forEach(taskFuchsTaskId => {
                console.log(`🗑️ Deleting TaskFuchs task: ${taskFuchsTaskId} (deleted in Todoist)`);
                dispatch({ type: 'DELETE_TASK', payload: taskFuchsTaskId });
              });
            }
            
            // Update local columns if needed
            if (result.localColumnsUpdated.length > 0 || result.localColumnsDeleted.length > 0) {
              // Handle column updates
              result.localColumnsUpdated.forEach(column => {
                console.log(`📝 Updating TaskFuchs column: ${column.id} to "${column.title}" (renamed in Todoist)`);
                dispatch({ 
                  type: 'UPDATE_PROJECT_KANBAN_COLUMN', 
                  payload: { 
                    columnId: column.id, 
                    title: column.title || 'Untitled'
                  } 
                });
              });
              
              // Handle column deletions
              result.localColumnsDeleted.forEach(columnId => {
                console.log(`🗑️ Deleting TaskFuchs column: ${columnId} (deleted in Todoist)`);
                dispatch({ type: 'DELETE_PROJECT_KANBAN_COLUMN', payload: columnId });
              });
            }
          
          // Note: Automatic date column creation is disabled
          // Date columns should only come from Todoist sections or be manually created
          // if (result.dateColumnsNeeded && result.dateColumnsNeeded.length > 0) {
          //   result.dateColumnsNeeded.forEach(dateStr => {
          //     dispatch({ type: 'ENSURE_DATE_COLUMN', payload: dateStr });
          //   });
          //   console.log(`📅 Created ${result.dateColumnsNeeded.length} date columns: ${result.dateColumnsNeeded.join(', ')}`);
          // }
        } else {
            setNewTodoistSyncStatus('error');
            setNewTodoistSyncMessage(`Synchronisation mit Fehlern abgeschlossen: ${result.errors.join(', ')}`);
          }
        } catch (error) {
        setNewTodoistSyncStatus('error');
        setNewTodoistSyncMessage(error instanceof Error ? error.message : 'Synchronisation fehlgeschlagen');
        setSyncErrors([error instanceof Error ? error.message : 'Unbekannter Fehler']);
        setSyncProgress(0);
        setSyncStep('Fehler aufgetreten');
        console.error('❌ Sync error:', error);
      }
    };

    // Reset sync configuration
    const resetSyncConfig = () => {
      todoistSyncManager.resetConfig();
      setNewTodoistSyncConfig(todoistSyncManager.getConfig());
      setNewTodoistSyncStatus('idle');
      setNewTodoistSyncMessage('');
      setNewTodoistSyncResult(null);
    };

    const isConfigured = newTodoistSyncConfig?.enabled && newTodoistSyncConfig?.apiToken && newTodoistSyncConfig?.projectMappings.length > 0;

    return (
      <div className="space-y-8">
        {/* Status Header */}
        <div className="p-6 rounded-lg border" style={{ 
          background: `linear-gradient(135deg, ${state.preferences.accentColor}15, ${state.preferences.accentColor}05)`,
          borderColor: `${state.preferences.accentColor}40`
        }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                isConfigured ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-800'
              }`}>
                <CheckCircle className={`w-6 h-6 ${
                  isConfigured ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'
                }`} />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Todoist-Synchronisation
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {isConfigured ? (
                    <>
                      ✅ Konfiguriert • {newTodoistSyncConfig?.projectMappings.length} Projekt(e) verknüpft
                      {newTodoistSyncConfig?.autoSyncInterval && newTodoistSyncConfig.autoSyncInterval > 0 && (
                        <span className="ml-2">• Auto-Sync alle {newTodoistSyncConfig.autoSyncInterval} Min.</span>
                      )}
                    </>
                  ) : (
                    'Noch nicht konfiguriert'
                  )}
                  </p>
                
                {/* Last Sync Info */}
                {newTodoistSyncConfig?.lastSync && (
                  <div className="mt-2 flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                    <Clock className="w-3 h-3" />
                    <span>
                      Letzter Sync: {new Date(newTodoistSyncConfig.lastSync).toLocaleString('de-DE')}
                    </span>
                    {newTodoistSyncConfig.lastSyncStatus === 'success' && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded text-xs">
                        Erfolgreich
                      </span>
                    )}
                    {newTodoistSyncConfig.lastSyncStatus === 'error' && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded text-xs">
                        Fehler
                      </span>
                    )}
                  </div>
                )}
          </div>
        </div>

            <div className="flex items-center space-x-3">
              {isConfigured && (
                  <button
                  onClick={() => setTodoistSetupDialogOpen(true)}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                  Bearbeiten
                  </button>
              )}
                              <Toggle 
                  enabled={newTodoistSyncConfig?.enabled || false} 
                  onChange={(enabled) => {
                    if (enabled && !isConfigured) {
                      setTodoistSetupDialogOpen(true);
                    } else {
                      todoistSyncManager.updateConfig({ enabled });
                      setNewTodoistSyncConfig(todoistSyncManager.getConfig());
                    }
                  }} 
                />
                </div>
              </div>
            </div>

        {/* Setup Required */}
        {!isConfigured ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                 style={{ backgroundColor: state.preferences.accentColor + '20' }}>
              <Settings className="w-8 h-8" style={{ color: state.preferences.accentColor }} />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Todoist-Synchronisation einrichten
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Verknüpfen Sie Ihre TaskFuchs-Projekte mit Todoist-Projekten für eine nahtlose bidirektionale Synchronisation.
            </p>
                        <button
              onClick={() => setTodoistSetupDialogOpen(true)}
              className="px-6 py-3 rounded-lg text-white font-medium transition-all duration-200 hover:shadow-lg flex items-center space-x-2"
                      style={{ backgroundColor: state.preferences.accentColor }}
                    >
              <span>Jetzt einrichten</span>
              <span className="px-2 py-0.5 text-xs rounded-full bg-white/20">
                Neue intuitive UI ✨
              </span>
                    </button>
                  </div>
        ) : (
          /* Configuration Overview & Manual Sync */
          <div className="space-y-6">
            {/* Project Mappings Overview */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Verknüpfte Projekte
              </h4>
              <div className="space-y-3">
                {newTodoistSyncConfig?.projectMappings.filter(m => m.enabled).map((mapping, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: state.preferences.accentColor }} />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {mapping.taskFuchsProjectName}
                </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                          <ArrowRight className="w-3 h-3 mx-2" />
                          {mapping.todoistProjectName}
                    </div>
                    </div>
                  </div>
                                              <div className="text-sm text-gray-500 dark:text-gray-400">
                          Spalten werden automatisch synchronisiert
                </div>
              </div>
                  ))}
                  </div>
                  </div>

              {/* Manual Sync */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white">Manuelle Synchronisation</h5>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                      Synchronisiere jetzt alle verknüpften Projekte mit Todoist
                      </p>
                    </div>
                    <button
                    onClick={() => performManualSync()}
                    disabled={newTodoistSyncStatus === 'running'}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      newTodoistSyncStatus === 'running' 
                          ? 'bg-gray-400 text-white cursor-not-allowed'
                        : newTodoistSyncStatus === 'success'
                          ? 'bg-green-600 text-white hover:bg-green-700'
                        : newTodoistSyncStatus === 'error'
                          ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'text-white hover:shadow-lg'
                      }`}
                    style={newTodoistSyncStatus === 'idle' ? { backgroundColor: state.preferences.accentColor } : {}}
                    >
                    {newTodoistSyncStatus === 'running' ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Synchronisiert...</span>
                        </div>
                                      ) : newTodoistSyncStatus === 'success' ? (
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4" />
                          <span>Erfolgreich</span>
                        </div>
                    ) : newTodoistSyncStatus === 'error' ? (
                        <div className="flex items-center space-x-2">
                          <X className="w-4 h-4" />
                          <span>Fehler</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <RefreshCw className="w-4 h-4" />
                          <span>Synchronisieren</span>
                        </div>
                      )}
                    </button>
                  
                  {/* Force Full Sync Button */}
                  <button
                    onClick={() => performManualSync(true)}
                    disabled={newTodoistSyncStatus === 'running'}
                    className={`px-3 py-2 rounded-lg font-medium transition-all border ${
                      newTodoistSyncStatus === 'running' 
                        ? 'border-gray-400 text-gray-400 cursor-not-allowed'
                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                    title="Vollständige Synchronisation erzwingen (alle Tasks)"
                  >
                    <div className="flex items-center space-x-2">
                      <RefreshCw className="w-4 h-4" />
                      <span>Vollsync</span>
                    </div>
                    </button>
                  </div>

                {/* Enhanced Sync Status Panel */}
                <div className="mt-4 space-y-3">
                  
                  {/* Progress Bar (during sync) */}
                  {newTodoistSyncStatus === 'running' && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">{syncStep}</span>
                        </div>
                        <span className="text-sm text-blue-600 dark:text-blue-400">{Math.round(syncProgress)}%</span>
                      </div>
                      <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full transition-all duration-300 ease-out"
                          style={{ 
                            width: `${syncProgress}%`,
                            backgroundColor: state.preferences.accentColor 
                          }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Timestamps Panel */}
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Letzter Sync:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatTimestamp(lastSyncTimestamp)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Letzter Vollsync:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatTimestamp(lastFullSyncTimestamp)}</span>
                      </div>
                    </div>
                    
                    {/* Conflict Indicator */}
                    {todoistConflicts.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                          <span className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                            {todoistConflicts.length} ungelöste Konflikte
                          </span>
                          <button
                            onClick={() => setConflictResolutionOpen(true)}
                            className="text-xs px-2 py-1 rounded border border-orange-300 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                          >
                            Auflösen
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sync Message */}
                  {newTodoistSyncMessage && (
                    <div className={`text-sm p-3 rounded-lg ${
                      newTodoistSyncStatus === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800' :
                      newTodoistSyncStatus === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800' :
                      'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                    }`}>
                      <div className="flex items-start space-x-2">
                        <div className="flex-shrink-0 mt-0.5">
                          {newTodoistSyncStatus === 'success' ? '✅' : 
                           newTodoistSyncStatus === 'error' ? '❌' : 'ℹ️'}
                        </div>
                        <div className="flex-grow">
                          {newTodoistSyncMessage}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Errors Panel */}
                  {syncErrors.length > 0 && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-red-600 dark:text-red-400 font-medium text-sm">Fehler ({syncErrors.length})</span>
                      </div>
                      <div className="space-y-1">
                        {syncErrors.slice(0, 3).map((error, index) => (
                          <div key={index} className="text-xs text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 p-2 rounded">
                            {error}
                          </div>
                        ))}
                        {syncErrors.length > 3 && (
                          <div className="text-xs text-red-600 dark:text-red-400">
                            ... und {syncErrors.length - 3} weitere Fehler
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                  {/* Enhanced Sync Result Panel */}
                  {newTodoistSyncResult && newTodoistSyncStatus === 'success' && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="text-sm text-green-800 dark:text-green-200">
                        <div className="flex items-center justify-between mb-3">
                          <p className="font-medium text-base">Sync-Ergebnis</p>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs px-2 py-1 rounded" style={{ 
                              backgroundColor: newTodoistSyncResult.syncType === 'incremental' ? '#0ea5e9' : '#22c55e',
                              color: 'white'
                            }}>
                              {newTodoistSyncResult.syncType === 'incremental' ? 'Inkrementell' : 'Vollständig'}
                            </span>
                            <span className="text-xs text-green-600 dark:text-green-400">
                              {((newTodoistSyncResult.syncDuration || 0) / 1000).toFixed(1)}s
                            </span>
                      </div>
                        </div>
                        
                        {/* Performance Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                          <div className="text-center p-2 bg-green-100 dark:bg-green-900/30 rounded">
                            <div className="text-lg font-bold">{newTodoistSyncResult.itemsProcessed || 0}</div>
                            <div className="text-xs text-green-600 dark:text-green-400">Verarbeitet</div>
                          </div>
                          {newTodoistSyncResult.itemsSkipped > 0 && (
                            <div className="text-center p-2 bg-blue-100 dark:bg-blue-900/30 rounded">
                              <div className="text-lg font-bold">{newTodoistSyncResult.itemsSkipped}</div>
                              <div className="text-xs text-blue-600 dark:text-blue-400">Übersprungen</div>
                    </div>
                  )}
                          {(newTodoistSyncResult.tasksCreated + newTodoistSyncResult.tasksUpdated) > 0 && (
                            <div className="text-center p-2 bg-purple-100 dark:bg-purple-900/30 rounded">
                              <div className="text-lg font-bold">
                                {newTodoistSyncResult.tasksCreated + newTodoistSyncResult.tasksUpdated}
                </div>
                              <div className="text-xs text-purple-600 dark:text-purple-400">Todoist-Änderungen</div>
              </div>
            )}
                          {(newTodoistSyncResult.localTasksAdded?.length + newTodoistSyncResult.localTasksUpdated?.length) > 0 && (
                            <div className="text-center p-2 bg-orange-100 dark:bg-orange-900/30 rounded">
                              <div className="text-lg font-bold">
                                {(newTodoistSyncResult.localTasksAdded?.length || 0) + (newTodoistSyncResult.localTasksUpdated?.length || 0)}
                              </div>
                              <div className="text-xs text-orange-600 dark:text-orange-400">Lokale Änderungen</div>
                            </div>
                          )}
                          {/* Labels/Tags Card */}
                          {(newTodoistSyncResult.labelsCreated > 0 || newTodoistSyncResult.tagsCreated?.length > 0) && (
                            <div className="text-center p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded">
                              <div className="text-lg font-bold">
                                {(newTodoistSyncResult.labelsCreated || 0) + (newTodoistSyncResult.tagsCreated?.length || 0)}
                              </div>
                              <div className="text-xs text-yellow-600 dark:text-yellow-400">Labels/Tags erstellt</div>
                            </div>
                          )}
                        </div>

                        {/* Detailed Changes */}
                        <div className="space-y-2">
                          {/* Tasks */}
                          {(newTodoistSyncResult.tasksCreated > 0 || newTodoistSyncResult.tasksUpdated > 0 || newTodoistSyncResult.tasksDeleted > 0) && (
                            <div className="flex flex-wrap gap-2">
                              <span className="text-xs font-medium text-green-700 dark:text-green-300">Aufgaben:</span>
                              {newTodoistSyncResult.tasksCreated > 0 && (
                                <span className="text-xs bg-green-200 dark:bg-green-800 px-2 py-1 rounded">➕ {newTodoistSyncResult.tasksCreated} erstellt</span>
                              )}
                              {newTodoistSyncResult.tasksUpdated > 0 && (
                                <span className="text-xs bg-blue-200 dark:bg-blue-800 px-2 py-1 rounded">📝 {newTodoistSyncResult.tasksUpdated} aktualisiert</span>
                              )}
                              {newTodoistSyncResult.tasksDeleted > 0 && (
                                <span className="text-xs bg-red-200 dark:bg-red-800 px-2 py-1 rounded">🗑️ {newTodoistSyncResult.tasksDeleted} gelöscht</span>
                              )}
                            </div>
                          )}
                          
                          {/* Local Changes */}
                          {(newTodoistSyncResult.localTasksAdded?.length > 0 || newTodoistSyncResult.localTasksUpdated?.length > 0 || newTodoistSyncResult.localTasksDeleted?.length > 0) && (
                            <div className="flex flex-wrap gap-2">
                              <span className="text-xs font-medium text-green-700 dark:text-green-300">Lokal:</span>
                              {newTodoistSyncResult.localTasksAdded?.length > 0 && (
                                <span className="text-xs bg-green-200 dark:bg-green-800 px-2 py-1 rounded">📥 {newTodoistSyncResult.localTasksAdded.length} importiert</span>
                              )}
                              {newTodoistSyncResult.localTasksUpdated?.length > 0 && (
                                <span className="text-xs bg-blue-200 dark:bg-blue-800 px-2 py-1 rounded">🔄 {newTodoistSyncResult.localTasksUpdated.length} aktualisiert</span>
                              )}
                              {newTodoistSyncResult.localTasksDeleted?.length > 0 && (
                                <span className="text-xs bg-red-200 dark:bg-red-800 px-2 py-1 rounded">🗑️ {newTodoistSyncResult.localTasksDeleted.length} gelöscht</span>
                              )}
                            </div>
                          )}
                          
                          {/* Columns/Sections */}
                          {(newTodoistSyncResult.sectionsCreated > 0 || newTodoistSyncResult.columnsCreated > 0 || newTodoistSyncResult.sectionsUpdated > 0 || newTodoistSyncResult.columnsUpdated > 0) && (
                            <div className="flex flex-wrap gap-2">
                              <span className="text-xs font-medium text-green-700 dark:text-green-300">Struktur:</span>
                              {newTodoistSyncResult.sectionsCreated > 0 && (
                                <span className="text-xs bg-green-200 dark:bg-green-800 px-2 py-1 rounded">🏗️ {newTodoistSyncResult.sectionsCreated} Bereiche erstellt</span>
                              )}
                              {newTodoistSyncResult.columnsCreated > 0 && (
                                <span className="text-xs bg-green-200 dark:bg-green-800 px-2 py-1 rounded">📂 {newTodoistSyncResult.columnsCreated} Spalten erstellt</span>
                              )}
                              {newTodoistSyncResult.sectionsUpdated > 0 && (
                                <span className="text-xs bg-blue-200 dark:bg-blue-800 px-2 py-1 rounded">🏗️ {newTodoistSyncResult.sectionsUpdated} Bereiche aktualisiert</span>
                              )}
                              {newTodoistSyncResult.columnsUpdated > 0 && (
                                <span className="text-xs bg-blue-200 dark:bg-blue-800 px-2 py-1 rounded">📂 {newTodoistSyncResult.columnsUpdated} Spalten aktualisiert</span>
                              )}
                            </div>
                          )}
                          
                          {/* Labels/Tags */}
                          {(newTodoistSyncResult.labelsCreated > 0 || newTodoistSyncResult.tagsCreated?.length > 0) && (
                            <div className="flex flex-wrap gap-2">
                              <span className="text-xs font-medium text-green-700 dark:text-green-300">Labels/Tags:</span>
                              {newTodoistSyncResult.labelsCreated > 0 && (
                                <span className="text-xs bg-yellow-200 dark:bg-yellow-800 px-2 py-1 rounded">🏷️ {newTodoistSyncResult.labelsCreated} Todoist Labels erstellt</span>
                              )}
                              {newTodoistSyncResult.tagsCreated?.length > 0 && (
                                <span className="text-xs bg-yellow-200 dark:bg-yellow-800 px-2 py-1 rounded">🏷️ {newTodoistSyncResult.tagsCreated.length} TaskFuchs Tags erstellt</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
              </div>

              {/* Quick Settings */}
              <div className="flex justify-between items-center">
                <div className="space-x-4">
              <button
                    onClick={() => setTodoistSetupDialogOpen(true)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Konfiguration bearbeiten
                  </button>
                <button
                  onClick={resetSyncConfig}
                  className="px-4 py-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 transition-colors"
                >
                  Zurücksetzen
              </button>
            </div>
            </div>
          </div>
        )}

        {/* Error Analysis Panel */}
        {newTodoistSyncResult && (newTodoistSyncResult.detailedErrors?.length > 0 || newTodoistSyncResult.partialFailures?.length > 0) && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-base font-medium text-red-800 dark:text-red-200">Error Analysis</h4>
              <div className="flex items-center space-x-2">
                {newTodoistSyncResult.retryAttempts > 0 && (
                  <span className="text-xs px-2 py-1 bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded">
                    {newTodoistSyncResult.retryAttempts} Wiederholungen
                  </span>
                )}
                {newTodoistSyncResult.circuitBreakerTriggered && (
                  <span className="text-xs px-2 py-1 bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 rounded">
                    Circuit Breaker ausgelöst
                  </span>
                )}
              </div>
            </div>

            {/* Detailed Errors */}
            {newTodoistSyncResult.detailedErrors?.length > 0 && (
              <div className="mb-4">
                <h5 className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">
                  Detailed Errors ({newTodoistSyncResult.detailedErrors.length})
                </h5>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {newTodoistSyncResult.detailedErrors.slice(0, 5).map((error, index) => (
                    <div key={index} className="text-xs bg-red-100 dark:bg-red-900/30 p-2 rounded">
                      <div className="flex justify-between items-start">
                        <span className="font-medium text-red-700 dark:text-red-300">{error.type}</span>
                        <span className="text-red-600 dark:text-red-400">#{error.attempt}</span>
                      </div>
                      <div className="text-red-600 dark:text-red-400 mt-1">{error.operation}</div>
                      <div className="text-red-800 dark:text-red-200 mt-1">{error.message}</div>
                    </div>
                  ))}
                  {newTodoistSyncResult.detailedErrors.length > 5 && (
                    <div className="text-xs text-red-600 dark:text-red-400 text-center py-1">
                      ... und {newTodoistSyncResult.detailedErrors.length - 5} weitere Fehler
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Partial Failures */}
            {newTodoistSyncResult.partialFailures?.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">
                  Partial Failures ({newTodoistSyncResult.partialFailures.length})
                </h5>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {newTodoistSyncResult.partialFailures.slice(0, 3).map((failure, index) => (
                    <div key={index} className="text-xs bg-orange-100 dark:bg-orange-900/30 p-2 rounded">
                      <div className="flex justify-between items-start">
                        <span className="font-medium text-orange-700 dark:text-orange-300">{failure.operation}</span>
                        <span className={`px-1 py-0.5 rounded text-xs ${
                          failure.recovered 
                            ? 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200'
                            : 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200'
                        }`}>
                          {failure.recovered ? 'Recovered' : 'Failed'}
                        </span>
                      </div>
                      {failure.entityName && (
                        <div className="text-orange-600 dark:text-orange-400 mt-1">
                          "{failure.entityName}"
                        </div>
                      )}
                      <div className="text-orange-800 dark:text-orange-200 mt-1">{failure.error.message}</div>
                    </div>
                  ))}
                  {newTodoistSyncResult.partialFailures.length > 3 && (
                    <div className="text-xs text-orange-600 dark:text-orange-400 text-center py-1">
                      ... und {newTodoistSyncResult.partialFailures.length - 3} weitere Failures
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error Recovery Actions */}
            <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-700">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => todoistSyncManager.clearErrorLog()}
                  className="text-xs px-3 py-1 bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:hover:bg-red-900/70 text-red-700 dark:text-red-300 rounded transition-colors"
                >
                  Error Log löschen
                </button>
                                 <button
                   onClick={() => performManualSync(true)} // Force full sync
                   className="text-xs px-3 py-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/50 dark:hover:bg-blue-900/70 text-blue-700 dark:text-blue-300 rounded transition-colors"
                 >
                   Recovery-Vollsync
                 </button>
                 <button
                   onClick={() => setErrorRecoveryTestOpen(true)}
                   className="text-xs px-3 py-1 bg-green-100 hover:bg-green-200 dark:bg-green-900/50 dark:hover:bg-green-900/70 text-green-700 dark:text-green-300 rounded transition-colors"
                 >
                   🧪 Error Recovery Test
                 </button>
              </div>
            </div>
          </div>
        )}

                  {/* Setup Dialog */}
          <TodoistSetupDialog
            isOpen={todoistSetupDialogOpen}
            onClose={() => setTodoistSetupDialogOpen(false)}
            onSyncConfigured={() => {
              setNewTodoistSyncConfig(todoistSyncManager.getConfig());
              setTodoistSetupDialogOpen(false);
            }}
            editMode={isConfigured} // Im Bearbeitungsmodus wenn bereits konfiguriert
          />
          
          {/* Conflict Resolution Modal */}
          <ConflictResolutionModal
            isOpen={conflictResolutionOpen}
            conflicts={todoistConflicts}
            onResolve={handleConflictResolution}
            onCancel={() => {
              setConflictResolutionOpen(false);
              setTodoistConflicts([]);
              setNewTodoistSyncStatus('idle');
              setNewTodoistSyncMessage('Synchronisation abgebrochen - Konflikte nicht aufgelöst');
            }}
          />
      </div>
    );
  };

  const renderSimpleApisSection = () => {
    return <SimpleApiSettings onShowSaved={() => { setShowSaved(true); setTimeout(() => setShowSaved(false), 2000); }} />;
  };

  const renderMicrosoftToDoSection = () => {
    return <MicrosoftToDoSettingsSection onShowSaved={() => { setShowSaved(true); setTimeout(() => setShowSaved(false), 2000); }} />;
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'appearance':
        return (
          <div className="space-y-8">
            <div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {t('settings.sections.appearance.title')}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {t('settings.sections.appearance.description')}
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Dunkler Modus</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Schaltet zwischen hellem und dunklem Design um</div>
                  </div>
                  <Toggle enabled={isDarkMode} onChange={handleDarkModeToggle} />
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Minimalistisches Design</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Reduziertes Design ohne Glaseffekte und Schatten</div>
                  </div>
                  <Toggle 
                    enabled={state.preferences.minimalDesign || false} 
                    onChange={() => {
                      const isEnabling = !state.preferences.minimalDesign;
                      
                      dispatch({
                        type: 'UPDATE_PREFERENCES',
                        payload: {
                          ...state.preferences,
                          minimalDesign: isEnabling,
                          // Bei Aktivierung des minimalistischen Designs automatisch:
                          ...(isEnabling && {
                            // Glaseffekte deaktivieren
                            glassEffects: {
                              ...state.preferences.glassEffects,
                              enabled: false,
                              primarySidebar: false,
                              secondarySidebar: false
                            },
                            // Weißen Hintergrund aktivieren
                            backgroundType: 'color',
                            backgroundColor: '#FFFFFF',
                            backgroundImage: undefined,
                            // Overlay deaktivieren
                            backgroundEffects: {
                              ...state.preferences.backgroundEffects,
                              blur: false,
                              overlay: false,
                              overlayOpacity: 0
                            }
                          })
                        }
                      });
                    }} 
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Farben</h3>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">Hauptfarbe</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Primäre Akzentfarbe der App</div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={customAccentColor}
                        onChange={(e) => handleColorChange('accent', e.target.value)}
                        className="w-10 h-10 rounded-lg border-2 border-gray-300 dark:border-gray-600 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={hexInput}
                        onChange={(e) => {
                          setHexInput(e.target.value);
                          if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                            handleColorChange('accent', e.target.value);
                          }
                        }}
                        placeholder="#e06610"
                        className="w-24 px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                      />
                    </div>
                  </div>
                  
                  {/* Color Palette Grid */}
                  <div className="mb-4">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Farbpalette</div>
                    <div className="grid grid-cols-3 gap-3">
                      {accentColors.map((colorOption, index) => (
                        <div 
                          key={index}
                          className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                            customAccentColor === colorOption
                              ? 'border-2 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                          }`}
                          style={customAccentColor === colorOption ? {
                            borderColor: colorOption,
                            boxShadow: `0 0 0 2px ${colorOption}20, 0 0 0 4px ${colorOption}`
                          } : {}}
                          onClick={() => handleColorChange('accent', colorOption)}
                        >
                          <div 
                            className="w-full h-16 transition-all duration-200 hover:scale-105"
                            style={{ backgroundColor: colorOption }}
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity flex items-center justify-center">
                            {customAccentColor === colorOption && (
                              <div className="bg-white dark:bg-gray-800 bg-opacity-90 px-2 py-1 rounded text-xs font-medium text-gray-900 dark:text-white">
                                Aktiv
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { type: 'success', color: customSuccessColor, label: 'Erfolg' },
                      { type: 'warning', color: customWarningColor, label: 'Warnung' },
                      { type: 'danger', color: customDangerColor, label: 'Fehler' },
                      { type: 'secondary', color: customSecondaryColor, label: 'Sekundär' }
                    ].map(({ type, color, label }) => (
                      <div key={type} className="text-center">
                        <input
                          type="color"
                          value={color}
                          onChange={(e) => handleColorChange(type as any, e.target.value)}
                          className="w-8 h-8 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer mx-auto block"
                        />
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Glasoptik-Effekte section removed: glass is auto-enabled when not in minimal design */}

            <div className={state.preferences.minimalDesign ? 'opacity-50 pointer-events-none' : ''}>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Hintergrund-Effekte
                {state.preferences.minimalDesign && (
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                    (Im minimalistischen Design nicht verfügbar)
                  </span>
                )}
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">Blur-Effekt</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Weichzeichnung für Hintergrundbilder</div>
                    </div>
                    <Toggle 
                      enabled={state.preferences.backgroundEffects?.blur === true} 
                      onChange={state.preferences.minimalDesign ? undefined : () => {
                        dispatch({ 
                          type: 'UPDATE_PREFERENCES', 
                          payload: { 
                            backgroundEffects: {
                              blur: !(state.preferences.backgroundEffects?.blur === true),
                              overlay: state.preferences.backgroundEffects?.overlay !== false,
                              overlayOpacity: state.preferences.backgroundEffects?.overlayOpacity || 0.4
                            }
                          }
                        });
                      }}
                      disabled={state.preferences.minimalDesign}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">Dunkles Overlay</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Transparente Verdunklung für bessere Lesbarkeit</div>
                    </div>
                    <Toggle 
                      enabled={state.preferences.backgroundEffects?.overlay !== false}
                      onChange={state.preferences.minimalDesign ? undefined : () => {
                        dispatch({ 
                          type: 'UPDATE_PREFERENCES', 
                          payload: { 
                            backgroundEffects: {
                              blur: state.preferences.backgroundEffects?.blur !== false,
                              overlay: !state.preferences.backgroundEffects?.overlay,
                              overlayOpacity: state.preferences.backgroundEffects?.overlayOpacity || 0.4
                            }
                          }
                        });
                      }}
                      disabled={state.preferences.minimalDesign}
                    />
                  </div>
                  
                  {state.preferences.backgroundEffects?.overlay !== false && (
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">Overlay-Transparenz</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {Math.round((state.preferences.backgroundEffects?.overlayOpacity || 0.4) * 100)}%
                          </div>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={state.preferences.backgroundEffects?.overlayOpacity || 0.4}
                          onChange={state.preferences.minimalDesign ? undefined : (e) => {
                            dispatch({ 
                              type: 'UPDATE_PREFERENCES', 
                              payload: { 
                                backgroundEffects: {
                                  blur: state.preferences.backgroundEffects?.blur !== false,
                                  overlay: state.preferences.backgroundEffects?.overlay !== false,
                                  overlayOpacity: parseFloat(e.target.value)
                                }
                              }
                            });
                          }}
                          disabled={state.preferences.minimalDesign}
                          className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                          style={{
                            background: `linear-gradient(to right, ${getAccentColorStyles().bg.backgroundColor} 0%, ${getAccentColorStyles().bg.backgroundColor} ${((state.preferences.backgroundEffects?.overlayOpacity || 0.4) * 100)}%, #e5e7eb ${((state.preferences.backgroundEffects?.overlayOpacity || 0.4) * 100)}%, #e5e7eb 100%)`
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            

            <div className={state.preferences.minimalDesign ? 'opacity-50 pointer-events-none' : ''}>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Hintergrund
                {state.preferences.minimalDesign && (
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                    (Im minimalistischen Design nicht verfügbar)
                  </span>
                )}
              </h3>
              <div className="space-y-6">
                {/* Background Type Selector */}
                <div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Hintergrundtyp</div>
                  <div className="flex space-x-2">
                    {[
                      { type: 'image', label: 'Bild' },
                      { type: 'color', label: 'Farbe' },
                      { type: 'gradient', label: 'Farbverlauf' }
                    ].map(({ type, label }) => (
                      <button
                        key={type}
                        onClick={state.preferences.minimalDesign ? undefined : () => handleBackgroundTypeChange(type as any)}
                        disabled={state.preferences.minimalDesign}
                        className={`px-4 py-2 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                          (state.preferences.backgroundType === type || (type === 'image' && !state.preferences.backgroundType))
                            ? 'text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                        style={(state.preferences.backgroundType === type || (type === 'image' && !state.preferences.backgroundType)) 
                          ? getAccentColorStyles().bg 
                          : {}}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Background Images Gallery */}
                {(!state.preferences.backgroundType || state.preferences.backgroundType === 'image') && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Hintergrundbilder</div>
                      <button
                        type="button"
                        onClick={() => setShowPhotoCreditsModal(true)}
                        className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors"
                        title="Photo credentials"
                      >
                        Credentials
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      {/* Gallery Images */}
                      {backgroundImageGallery.map((imageUrl, index) => (
                        <div 
                          key={index}
                          className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                            state.preferences.backgroundImage === imageUrl
                              ? 'border-2 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                          }`}
                          style={state.preferences.backgroundImage === imageUrl ? {
                            borderColor: getAccentColorStyles().border.borderColor,
                            boxShadow: `0 0 0 2px ${getAccentColorStyles().bg.backgroundColor}20, 0 0 0 4px ${getAccentColorStyles().bg.backgroundColor}`
                          } : {}}
                          onClick={() => handleSelectImageFromGallery(imageUrl)}
                        >
                          <img 
                            src={imageUrl} 
                            alt={`Hintergrundbild ${index + 1}`}
                            className="w-full h-20 object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                              if (nextElement) nextElement.style.display = 'flex';
                            }}
                          />
                          <div className="hidden w-full h-20 bg-gray-100 dark:bg-gray-700 items-center justify-center">
                            <span className="text-xs text-gray-500">Bild nicht verfügbar</span>
                          </div>
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity flex items-center justify-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveImageFromGallery(imageUrl);
                              }}
                              className="opacity-0 group-hover:opacity-100 bg-red-500 text-white p-1.5 rounded-full transition-opacity hover:bg-red-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          {state.preferences.backgroundImage === imageUrl && (
                            <div className="absolute bottom-1 left-1 right-1">
                              <div className="text-white text-xs px-1 py-0.5 rounded text-center truncate font-medium" 
                                   style={{ backgroundColor: getAccentColorStyles().bg.backgroundColor }}>
                                Aktuell
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {/* Add New Image Button */}
                      <button
                        onClick={handleOpenImageUrlModal}
                        className="w-full h-20 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 transition-colors group"
                      >
                        <Plus className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-xs text-center px-1 leading-tight">Link zu einer<br/>Bilddatei hinzufügen</span>
                      </button>
                      
                      {/* Picsum Photos Button */}
                      <button
                        onClick={() => setShowStockPhotosModal(true)}
                        className="w-full h-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center hover:scale-105 transition-all group relative overflow-hidden"
                        style={{ 
                          borderColor: getAccentColorStyles().bg.backgroundColor,
                          backgroundColor: getAccentColorStyles().bg.backgroundColor
                        }}
                      >
                        {/* Background overlay for better contrast */}
                        <div 
                          className="absolute inset-0 opacity-90"
                          style={{ 
                            background: `linear-gradient(135deg, ${getAccentColorStyles().bg.backgroundColor}, ${getAccentColorStyles().bg.backgroundColor}dd)`
                          }}
                        />
                        
                        <div className="relative z-10 w-6 h-6 mb-1 group-hover:scale-110 transition-transform flex items-center justify-center">
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white drop-shadow-lg">
                            <path d="M1.5 6A1.5 1.5 0 013 4.5h18A1.5 1.5 0 0122.5 6v12a1.5 1.5 0 01-1.5 1.5H3A1.5 1.5 0 011.5 18V6zM3 6v12h18V6H3zm6.75 3a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM5.25 15L9 11.25l2.25 2.25L15.75 9l2.25 2.25V15H5.25z"/>
                          </svg>
                        </div>
                        <span className="relative z-10 text-xs text-center px-1 leading-tight font-semibold text-white drop-shadow-lg">
                          Picsum<br/>Photos
                        </span>
                      </button>

                      {/* Restore default images */}
                      <button
                        onClick={() => {
                          const defaults = Array.from({ length: 12 }, (_, i) => `/backgrounds/bg${i + 1}.jpg`);
                          setBackgroundImageGallery(defaults);
                          localStorage.setItem('backgroundImageGallery', JSON.stringify(defaults));
                        }}
                        className="w-full h-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center hover:scale-105 transition-all group"
                        style={{ borderColor: getAccentColorStyles().bg.backgroundColor }}
                        title="Standardbilder wiederherstellen"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mb-1" style={getAccentColorStyles().text as any}>
                          <path d="M12 5v4l5-5-5-5v4C6.48 3 2 7.48 2 13c0 1.64.4 3.19 1.1 4.56l1.48-1.48A7.965 7.965 0 014 13c0-4.42 3.58-8 8-8zm8.9 1.44L19.42 7.9A7.965 7.965 0 0120 13c0 4.42-3.58 8-8 8v-4l-5 5 5 5v-4c5.52 0 10-4.48 10-10 0-1.64-.4-3.19-1.1-4.56z" />
                        </svg>
                        <span className="text-xs text-center px-1 leading-tight" style={getAccentColorStyles().text}>Standardbilder</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Background Color */}
                {state.preferences.backgroundType === 'color' && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Hintergrundfarbe</div>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={backgroundColorTemp}
                        onChange={(e) => handleTempBackgroundColorChange(e.target.value)}
                        className="w-16 h-12 rounded-lg border-2 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-colors cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Aktuelle Farbe: <span className="font-mono">{backgroundColorTemp}</span>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={backgroundColorTemp}
                        onChange={(e) => {
                          if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value) || e.target.value === '') {
                            handleTempBackgroundColorChange(e.target.value);
                          }
                        }}
                        placeholder="#f3f4f6"
                        className="w-24 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2"
                        style={{ '--tw-ring-color': getAccentColorStyles().bg.backgroundColor } as any}
                      />
                    </div>
                    
                    {/* Background Color Palette */}
                    <div className="mt-4">
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Farbpalette</div>
                      <div className="grid grid-cols-3 gap-3">
                        {backgroundColors.map((colorOption, index) => (
                          <div 
                            key={index}
                            className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                              backgroundColorTemp === colorOption
                                ? 'border-2 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800'
                                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                            }`}
                            style={backgroundColorTemp === colorOption ? {
                              borderColor: colorOption,
                              boxShadow: `0 0 0 2px ${colorOption}20, 0 0 0 4px ${colorOption}`
                            } : {}}
                            onClick={() => handleTempBackgroundColorChange(colorOption)}
                          >
                            <div 
                              className="w-full h-16 transition-all duration-200 hover:scale-105"
                              style={{ backgroundColor: colorOption }}
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity flex items-center justify-center">
                              {backgroundColorTemp === colorOption && (
                                <div className="bg-white dark:bg-gray-800 bg-opacity-90 px-2 py-1 rounded text-xs font-medium text-gray-900 dark:text-white">
                                  Aktiv
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Gradient Colors */}
                {state.preferences.backgroundType === 'gradient' && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Farbverlauf</div>
                    <div className="space-y-4">
                      {/* From Color */}
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          value={gradientFromTemp}
                          onChange={(e) => handleTempGradientFromChange(e.target.value)}
                          className="w-12 h-12 rounded-lg border-2 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-colors cursor-pointer"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Startfarbe</div>
                          <input
                            type="text"
                            value={gradientFromTemp}
                            onChange={(e) => {
                              if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value) || e.target.value === '') {
                                handleTempGradientFromChange(e.target.value);
                              }
                            }}
                            className="text-xs text-gray-500 dark:text-gray-400 font-mono bg-transparent border-none focus:outline-none w-full"
                          />
                        </div>
                      </div>

                      {/* To Color */}
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          value={gradientToTemp}
                          onChange={(e) => handleTempGradientToChange(e.target.value)}
                          className="w-12 h-12 rounded-lg border-2 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-colors cursor-pointer"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Endfarbe</div>
                          <input
                            type="text"
                            value={gradientToTemp}
                            onChange={(e) => {
                              if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value) || e.target.value === '') {
                                handleTempGradientToChange(e.target.value);
                              }
                            }}
                            className="text-xs text-gray-500 dark:text-gray-400 font-mono bg-transparent border-none focus:outline-none w-full"
                          />
                        </div>
                      </div>

                      {/* Gradient Direction */}
                      <div>
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Richtung</div>
                        <div className="grid grid-cols-4 gap-2">
                          {gradientDirections.map(({ value, label, icon: Icon }) => (
                            <button
                              key={value}
                              onClick={() => handleTempGradientDirectionChange(value)}
                              className={`p-2 rounded-lg text-xs transition-colors ${
                                gradientDirectionTemp === value
                                  ? 'text-white'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                              }`}
                              style={gradientDirectionTemp === value ? getAccentColorStyles().bg : {}}
                            >
                              <Icon className="w-4 h-4 mx-auto mb-1" />
                              <div className="truncate">{label.split(' ')[1]}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Save Button */}
                      {hasUnsavedBgChanges && (
                        <button
                          onClick={handleSaveBackgroundSettings}
                          className="w-full px-4 py-2 text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
                          style={getAccentColorStyles().bg}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = getAccentColorStyles().bgHover.backgroundColor;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = getAccentColorStyles().bg.backgroundColor;
                          }}
                        >
                          <Save className="w-4 h-4" />
                          <span>Farbverlauf speichern</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>


          </div>
        );

      case 'language':
        return (
          <div className="space-y-6">
            <div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {t('settings.sections.language.title')}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {t('settings.sections.language.description')}
                </p>
              </div>
              
              {/* Elegant Language Toggle */}
              <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-2xl inline-flex relative">
                <div 
                  className="absolute top-2 h-10 rounded-xl transition-all duration-300 ease-in-out shadow-lg"
                  style={{
                    left: language === 'de' ? '8px' : '50%',
                    width: 'calc(50% - 8px)',
                    ...getAccentColorStyles().bg
                  }}
                />
                
                {[
                  { code: 'de', name: 'Deutsch' },
                  { code: 'en', name: 'English' }
                ].map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`relative z-10 flex items-center justify-center px-6 py-2 rounded-xl transition-all duration-300 font-medium ${
                      language === lang.code
                        ? 'font-semibold'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                    style={language === lang.code ? { color: '#ffffff' } : {}}
                  >
                    <span>{lang.name}</span>
                  </button>
                ))}
              </div>
              
              {/* Current Language Info */}
              <div 
                className="mt-6 p-4 rounded-xl border"
                style={{
                  ...getAccentColorStyles().bgLight,
                  borderColor: getAccentColorStyles().border.borderColor
                }}
              >
                <div className="flex items-center gap-3">
                  <Globe 
                    className="w-5 h-5" 
                    style={getAccentColorStyles().text}
                  />
                  <div>
                    <p 
                      className="text-sm font-medium"
                      style={getAccentColorStyles().text}
                    >
                      {t('settings.sections.language.current')}
                    </p>
                    <p 
                      className="text-xs" 
                      style={{
                        color: `${getAccentColorStyles().text.color}cc`
                      }}
                    >
                      {t('settings.sections.language.description_text')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'notes':
        return (
          <div className="space-y-6">
            <div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {t('settings.sections.notes.title')}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {t('settings.sections.notes.description')}
                </p>
              </div>
              <div className="space-y-6">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="font-medium text-gray-900 dark:text-white mb-3">Template für neue Daily Notes</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Definiere eine Vorlage für neue Daily Notes. Verwende <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{'{date}'}</code> als Platzhalter für das Datum.
                  </div>
                  <textarea
                    value={state.preferences.dailyNoteTemplate || ''}
                    onChange={(e) => dispatch({
                      type: 'UPDATE_PREFERENCES',
                      payload: { dailyNoteTemplate: e.target.value }
                    })}
                    placeholder="# {date}

## Ziele für heute
- 

## Notizen


## Reflexion
- Was lief gut?
- Was könnte besser werden?
- Nächste Schritte:"
                    rows={12}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm resize-vertical"
                  />
                  <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                    Tipp: Verwende Markdown-Syntax für Formatierung (z.B. # für Überschriften, - für Listen)
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      // Images section removed; moved under 'data'
      case 'images':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Bildspeicher</h3>
              <div className="space-y-6">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">Screenshots & Bilder verwalten</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Verwalte alle über Copy & Paste eingefügten Bilder in deinen Notizen
                      </div>
                    </div>
                    <button
                      onClick={() => setShowImageStorageManager(true)}
                      className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-all flex items-center space-x-2"
                      style={getAccentColorStyles().bg}
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span>Bilder verwalten</span>
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-white dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Gespeicherte Bilder</div>
                      <div className="text-xl font-semibold text-gray-900 dark:text-white">
                        {state.imageStorage.images.length}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Verwendeter Speicher</div>
                      <div className="text-xl font-semibold text-gray-900 dark:text-white">
                        {Math.round((state.imageStorage.totalSize / state.imageStorage.maxSize) * 100)}%
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    💡 <strong>Tipp:</strong> Füge Screenshots direkt in deine Notizen ein mit Cmd+V (Mac) oder Ctrl+V (Windows/Linux)
                  </div>
                  
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                    <button
                      onClick={() => setShowImageStorageDebugger(true)}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span>Debug Image Storage</span>
                    </button>
                  </div>
                </div>
                
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="font-medium text-gray-900 dark:text-white mb-3">Automatische Bereinigung</div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-sm text-gray-900 dark:text-white">Ungenutzte Bilder automatisch löschen</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Bilder werden nach {state.imageStorage.cleanupAfterDays} Tagen gelöscht, wenn sie nicht mehr verwendet werden
                      </div>
                    </div>
                    <Toggle 
                      enabled={state.imageStorage.autoCleanup}
                      onChange={() => dispatch({
                        type: 'SET_IMAGE_STORAGE',
                        payload: {
                          ...state.imageStorage,
                          autoCleanup: !state.imageStorage.autoCleanup
                        }
                      })} 
                    />
                  </div>
                  
                  {state.imageStorage.autoCleanup && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-900 dark:text-white">Bereinigung nach (Tage)</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {state.imageStorage.cleanupAfterDays}
                        </div>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="90"
                        step="1"
                        value={state.imageStorage.cleanupAfterDays}
                        onChange={(e) => dispatch({
                          type: 'SET_IMAGE_STORAGE',
                          payload: {
                            ...state.imageStorage,
                            cleanupAfterDays: parseInt(e.target.value)
                          }
                        })}
                        className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                      />
                    </div>
                  )}

                  {/* Storage Size Configuration */}
                  <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">Speichergröße</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Maximale Größe des Bildspeichers
                        </div>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {(state.imageStorage.maxSize / (1024 * 1024)).toFixed(0)} MB
                      </div>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="500"
                      step="10"
                      value={state.imageStorage.maxSize / (1024 * 1024)}
                      onChange={(e) => dispatch({
                        type: 'SET_IMAGE_STORAGE',
                        payload: {
                          ...state.imageStorage,
                          maxSize: parseInt(e.target.value) * 1024 * 1024
                        }
                      })}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                      <span>10 MB</span>
                      <span>500 MB</span>
                    </div>
                  </div>

                  {/* Compression Quality Configuration */}
                  <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">Komprimierungsqualität</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Qualität der Bildkomprimierung (höher = bessere Qualität, größere Dateien)
                        </div>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {Math.round(state.imageStorage.compressionQuality * 100)}%
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.1"
                      value={state.imageStorage.compressionQuality}
                      onChange={(e) => dispatch({
                        type: 'SET_IMAGE_STORAGE',
                        payload: {
                          ...state.imageStorage,
                          compressionQuality: parseFloat(e.target.value)
                        }
                      })}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                      <span>10%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'sidebar':
        return (
          <div className="space-y-8">
            <div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {t('settings.sections.sidebar.title')}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {t('settings.sections.sidebar.description_long', {
                    defaultValue: 'Menü anpassen und Festlegen, welche Einträge hinter "... Mehr" erscheinen sollen.'
                  })}
                </p>
              </div>
              
              <div className="space-y-2">
                {sidebarItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div 
                      key={item.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', index.toString());
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                        const toIndex = index;
                        if (fromIndex !== toIndex) {
                          handleSidebarItemReorder(fromIndex, toIndex);
                        }
                      }}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-move hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing"
                          title="Ziehen zum Sortieren"
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>
                        <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {item.label}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => index > 0 && handleSidebarItemReorder(index, index - 1)}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Nach oben"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => index < sidebarItems.length - 1 && handleSidebarItemReorder(index, index + 1)}
                          disabled={index === sidebarItems.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Nach unten"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        {/* Toggle whether item is in "Mehr" menu */}
                        <button
                          onClick={() => {
                            const current = state.preferences.sidebar?.moreItems || ['series', 'review', 'archive', 'tags', 'statistics'];
                            const isInMore = current.includes(item.id);
                            const updated = isInMore ? current.filter(id => id !== item.id) : [...current, item.id];
                            dispatch({
                              type: 'UPDATE_PREFERENCES',
                              payload: {
                                sidebar: {
                                  ...state.preferences.sidebar,
                                  moreItems: updated
                                }
                              }
                            });
                          }}
                          className={`px-2 py-1 text-xs rounded border inline-flex items-center space-x-1 ${
                            (state.preferences.sidebar?.moreItems || ['series','review','archive','tags','statistics']).includes(item.id)
                              ? 'text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                              : 'text-gray-400 border-gray-300 dark:border-gray-700'
                          }`}
                          title={t('settings.sections.sidebar.place_in_more_tooltip', { defaultValue: 'Im Mehr-Menü anzeigen' })}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                          <span>{t('common.more', { defaultValue: 'Mehr' })}</span>
                        </button>
                        {['today', 'inbox', 'tasks'].includes(item.id) ? (
                          <div 
                            className="p-1 text-gray-300 dark:text-gray-600 cursor-not-allowed"
                            title="Dieser Menüpunkt kann nicht ausgeblendet werden"
                          >
                            <Eye className="w-4 h-4" />
                          </div>
                        ) : (
                          <button
                            onClick={() => handleSidebarItemVisibilityToggle(item.id)}
                            className={`p-1 ${
                              item.visible 
                                ? 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200' 
                                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                            }`}
                            title={item.visible ? 'Ausblenden' : 'Einblenden'}
                          >
                            {item.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-6 p-4 rounded-lg" style={{ 
                backgroundColor: `${state.preferences.accentColor}15`,
                color: `${state.preferences.accentColor}E6`
              }}>
                <div className="flex items-start space-x-3">
                  <Bell className="w-5 h-5 mt-0.5" style={{ color: state.preferences.accentColor }} />
                  <div>
                    <h4 className="text-sm font-medium" style={{ color: state.preferences.accentColor }}>Hinweis</h4>
                    <p className="text-sm opacity-75 mt-1" style={{ color: state.preferences.accentColor }}>
                      Die Punkte "Heute", "Inbox" und "Tagesplaner" können nicht ausgeblendet werden, da sie für die Grundfunktion der App erforderlich sind.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'notifications':
        return (
          <div className="space-y-8">
            <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {t('settings.sections.notifications.title')}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {t('settings.sections.notifications.description')}
              </p>
            </div>
            {/* Browser Notifications Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Browser-Benachrichtigungen</h3>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">Desktop-Benachrichtigungen</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Erhalten Sie Erinnerungen auch wenn die App im Hintergrund läuft
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {(() => {
                        const permission = typeof window !== 'undefined' && 'Notification' in window 
                          ? Notification.permission 
                          : 'denied';
                        
                        if (permission === 'granted') {
                          return (
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-sm text-green-600 dark:text-green-400">Aktiviert</span>
                            </div>
                          );
                        } else if (permission === 'denied') {
                          return (
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                              <span className="text-sm text-red-600 dark:text-red-400">Blockiert</span>
                            </div>
                          );
                        } else {
                          return (
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                              <span className="text-sm text-yellow-600 dark:text-yellow-400">Ausstehend</span>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {(() => {
                      const permission = typeof window !== 'undefined' && 'Notification' in window 
                        ? Notification.permission 
                        : 'denied';
                      
                      if (permission === 'granted') {
                        return (
                          <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                            <div className="flex items-center space-x-3">
                              <Bell className="w-5 h-5 text-green-600 dark:text-green-400" />
                              <div>
                                <div className="text-sm font-medium text-green-900 dark:text-green-100">
                                  Benachrichtigungen sind aktiviert
                                </div>
                                <div className="text-xs text-green-600 dark:text-green-400">
                                  Sie erhalten Erinnerungen für Ihre Aufgaben
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={async () => {
                                const { notificationService } = await import('../../utils/notificationService');
                                await notificationService.showNotification({
                                  title: 'Test-Benachrichtigung',
                                  body: 'Ihre Benachrichtigungen funktionieren einwandfrei.',
                                  icon: '/Fuchs.svg',
                                  tag: 'test-notification',
                                  silent: false,
                                  requireInteraction: false
                                });
                              }}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors duration-200"
                            >
                              Testen
                            </button>
                          </div>
                        );
                      } else if (permission === 'denied') {
                        return (
                          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                            <div className="flex items-start space-x-3">
                              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 mt-0.5" />
                              <div className="flex-1">
                                <div className="text-sm font-medium text-red-900 dark:text-red-100 mb-2">
                                  🚫 Benachrichtigungen sind blockiert
                                </div>
                                <div className="text-xs text-red-600 dark:text-red-400 mb-3">
                                  Aktivieren Sie Benachrichtigungen in Ihren Browser-Einstellungen:
                                </div>
                                
                                {/* Step-by-step instructions */}
                                <div className="space-y-2 text-xs text-red-600 dark:text-red-400">
                                  <div className="flex items-start space-x-2">
                                    <span className="font-medium">1.</span>
                                    <span>Klicken Sie auf das 🔒 Symbol in der Adressleiste</span>
                                  </div>
                                  <div className="flex items-start space-x-2">
                                    <span className="font-medium">2.</span>
                                    <span>Wählen Sie "Benachrichtigungen" → "Zulassen"</span>
                                  </div>
                                  <div className="flex items-start space-x-2">
                                    <span className="font-medium">3.</span>
                                    <span>Laden Sie die Seite neu (F5 oder Strg+R)</span>
                                  </div>
                                </div>
                                
                                {/* Browser-specific instructions */}
                                <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800">
                                  <div className="text-xs text-red-500 dark:text-red-400 mb-2">
                                    <strong>Alternative (Chrome):</strong>
                                  </div>
                                  <div className="text-xs text-red-500 dark:text-red-400">
                                    Einstellungen → Datenschutz und Sicherheit → Website-Einstellungen → Benachrichtigungen
                                  </div>
                                </div>
                                
                                {/* Action buttons */}
                                <div className="flex space-x-2 mt-4">
                                  <button
                                    onClick={() => {
                                      // Show detailed help modal
                                      const helpModal = document.createElement('div');
                                      helpModal.innerHTML = `
                                        <div style="
                                          position: fixed;
                                          top: 0;
                                          left: 0;
                                          width: 100%;
                                          height: 100%;
                                          background: rgba(0,0,0,0.7);
                                          display: flex;
                                          align-items: center;
                                          justify-content: center;
                                          z-index: 10000;
                                        ">
                                          <div style="
                                            background: white;
                                            border-radius: 12px;
                                            padding: 24px;
                                            max-width: 500px;
                                            margin: 20px;
                                            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                                          ">
                                            <div style="text-align: center; margin-bottom: 20px;">
                                              <div style="font-size: 48px; margin-bottom: 12px;">🔔</div>
                                              <h2 style="margin: 0; color: #1a1a1a; font-size: 20px; font-weight: 600;">
                                                Benachrichtigungen aktivieren
                                              </h2>
                                            </div>
                                            <div style="color: #4a4a4a; line-height: 1.6; margin-bottom: 20px;">
                                              <p><strong>Schritt 1:</strong> Schauen Sie in die Adressleiste Ihres Browsers</p>
                                              <p><strong>Schritt 2:</strong> Klicken Sie auf das 🔒 oder 🛡️ Symbol</p>
                                              <p><strong>Schritt 3:</strong> Ändern Sie "Benachrichtigungen" auf "Zulassen"</p>
                                              <p><strong>Schritt 4:</strong> Laden Sie die Seite neu (F5)</p>
                                            </div>
                                            <div style="text-align: center;">
                                              <button onclick="this.closest('div').remove()" style="
                                                background: #3b82f6;
                                                color: white;
                                                border: none;
                                                padding: 10px 20px;
                                                border-radius: 6px;
                                                cursor: pointer;
                                                font-size: 14px;
                                              ">
                                                Verstanden
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      `;
                                      document.body.appendChild(helpModal);
                                    }}
                                    className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-800 dark:text-red-100 dark:hover:bg-red-700 rounded-md transition-colors duration-200"
                                  >
                                    📋 Anleitung anzeigen
                                  </button>
                                  
                                  <button
                                    onClick={() => {
                                      window.location.reload();
                                    }}
                                    className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-800 dark:text-red-100 dark:hover:bg-red-700 rounded-md transition-colors duration-200"
                                  >
                                    🔄 Seite neu laden
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center space-x-3">
                              <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                              <div>
                                <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                  Benachrichtigungen aktivieren
                                </div>
                                <div className="text-xs text-blue-600 dark:text-blue-400">
                                  Erhalten Sie Erinnerungen für Ihre Aufgaben
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={async () => {
                                const { notificationService } = await import('../../utils/notificationService');
                                await notificationService.requestPermission();
                              }}
                              className="px-3 py-1.5 text-xs font-medium text-white rounded-md transition-colors duration-200 hover:opacity-90"
                              style={{ backgroundColor: state.preferences.accentColor }}
                            >
                              Aktivieren
                            </button>
                          </div>
                        );
                      }
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Audio Notifications Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Audio-Benachrichtigungen</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Sounds aktiviert</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Aktiviert Audio-Benachrichtigungen</div>
                  </div>
                  <Toggle 
                    enabled={state.preferences.sounds} 
                    onChange={() => dispatch({
                      type: 'UPDATE_PREFERENCES',
                      payload: { sounds: !state.preferences.sounds }
                    })} 
                  />
                </div>

                {state.preferences.sounds && (
                  <>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <div className="font-medium text-gray-900 dark:text-white">Lautstärke</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {Math.round(state.preferences.soundVolume * 100)}%
                        </div>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={state.preferences.soundVolume}
                        onChange={(e) => dispatch({
                          type: 'UPDATE_PREFERENCES',
                          payload: { soundVolume: parseFloat(e.target.value) }
                        })}
                        className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                      />
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="font-medium text-gray-900 dark:text-white mb-4">Erfolgsklang</div>
                      <div className="space-y-3">
                        {[
                          { value: 'bell', label: 'Glocke', description: 'Klarer Glockenton' },
                          { value: 'chime', label: 'Glockenspiel', description: 'Aufsteigende Melodie' },
                          { value: 'pop', label: 'Pop', description: 'Kurzer, knackiger Sound' },
                          { value: 'none', label: 'Stumm', description: 'Kein Sound' }
                        ].map((sound) => (
                          <div
                            key={sound.value}
                            className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                              state.preferences.completionSound === sound.value
                                ? 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                            style={state.preferences.completionSound === sound.value ? {
                              borderColor: state.preferences.accentColor,
                              backgroundColor: `${state.preferences.accentColor}15`
                            } : {}}
                            onClick={() => dispatch({
                              type: 'UPDATE_PREFERENCES',
                              payload: { completionSound: sound.value as SoundType }
                            })}
                          >
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">{sound.label}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{sound.description}</div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {state.preferences.completionSound === sound.value && (
                                <Check className="w-5 h-5" style={{ color: state.preferences.accentColor }} />
                              )}
                              {sound.value !== 'none' && (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    await handleTestSound(sound.value as 'none' | 'pop' | 'bell' | 'chime');
                                  }}
                                  className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                >
                                  <Play className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Verhalten</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Aufgaben-Prioritäten anzeigen</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Zeigt Prioritäts-Indikatoren in Aufgaben</div>
                  </div>
                  <Toggle 
                    enabled={state.preferences.showPriorities} 
                    onChange={() => dispatch({
                      type: 'UPDATE_PREFERENCES',
                      payload: { showPriorities: !state.preferences.showPriorities }
                    })} 
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Erfolgs-Animation</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Fuchs-Animation beim Abhaken von Aufgaben</div>
                  </div>
                  <Toggle 
                    enabled={state.preferences.enableCelebration} 
                    onChange={() => dispatch({
                      type: 'UPDATE_PREFERENCES',
                      payload: { enableCelebration: !state.preferences.enableCelebration }
                    })} 
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white flex items-center">
                      <Trophy className="w-4 h-4 mr-2" />
                      Tag beenden
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Zeigt einen Button zum Beenden des Arbeitstages mit Statistiken</div>
                  </div>
                  <Toggle 
                    enabled={state.preferences.enableEndOfDay} 
                    onChange={() => dispatch({
                      type: 'UPDATE_PREFERENCES',
                      payload: { enableEndOfDay: !state.preferences.enableEndOfDay }
                    })} 
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'timer':
        return (
          <div className="space-y-8">
            <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Zeiterfassung & Pomodoro
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Stelle die Timer-Anzeige ein, konfiguriere Pomodoro-Intervalle und verbinde optionale Zeit-Integrationen.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Timer-Anzeige</h3>
              <div className="space-y-4">
                {/* Timer Display Mode Selection */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="font-medium text-gray-900 dark:text-white mb-2">Timer-Anzeigemodus</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">Wählen Sie, wie der Timer angezeigt werden soll</div>
                  <div className="grid grid-cols-1 gap-3">
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                           style={{ 
                             borderColor: state.preferences.timerDisplayMode === 'topBar' ? state.preferences.accentColor : undefined,
                             backgroundColor: state.preferences.timerDisplayMode === 'topBar' ? `${state.preferences.accentColor}10` : undefined
                           }}>
                      <input
                        type="radio"
                        name="timerDisplayMode"
                        value="topBar"
                        checked={state.preferences.timerDisplayMode === 'topBar'}
                        onChange={() => dispatch({
                          type: 'UPDATE_PREFERENCES',
                          payload: { timerDisplayMode: 'topBar' }
                        })}
                        className="mr-3"
                        style={{ accentColor: state.preferences.accentColor }}
                      />
                  <div>
                        <div className="font-medium text-gray-900 dark:text-white">Timer-Leiste (oben)</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Zeigt den Timer in einer festen Leiste am oberen Bildschirmrand</div>
                  </div>
                    </label>
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                           style={{ 
                             borderColor: state.preferences.timerDisplayMode === 'floatingWidget' ? state.preferences.accentColor : undefined,
                             backgroundColor: state.preferences.timerDisplayMode === 'floatingWidget' ? `${state.preferences.accentColor}10` : undefined
                           }}>
                      <input
                        type="radio"
                        name="timerDisplayMode"
                        value="floatingWidget"
                        checked={state.preferences.timerDisplayMode === 'floatingWidget'}
                    onChange={() => dispatch({
                      type: 'UPDATE_PREFERENCES',
                          payload: { timerDisplayMode: 'floatingWidget' }
                        })}
                        className="mr-3"
                        style={{ accentColor: state.preferences.accentColor }}
                      />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">Schwebendes Widget</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Verschiebares Timer-Widget mit minimaler Anzeige</div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Pomodoro-Technik</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Pomodoro aktiviert</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Aktiviert strukturierte Arbeits- und Pausenzeiten</div>
                  </div>
                  <Toggle 
                    enabled={state.preferences.pomodoro.enabled} 
                    onChange={() => dispatch({
                      type: 'UPDATE_PREFERENCES',
                      payload: { 
                        pomodoro: { 
                          ...state.preferences.pomodoro, 
                          enabled: !state.preferences.pomodoro.enabled 
                        } 
                      }
                    })} 
                  />
                </div>

                {state.preferences.pomodoro.enabled && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="font-medium text-gray-900 dark:text-white mb-2">
                          Arbeitszeit: {state.preferences.pomodoro.workDuration} Min
                        </div>
                        <input
                          type="range"
                          min="15"
                          max="60"
                          step="5"
                          value={state.preferences.pomodoro.workDuration}
                          onChange={(e) => dispatch({
                            type: 'UPDATE_PREFERENCES',
                            payload: { 
                              pomodoro: { 
                                ...state.preferences.pomodoro, 
                                workDuration: parseInt(e.target.value) 
                              } 
                            }
                          })}
                          className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                        />
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <span>15</span>
                          <span>60</span>
                        </div>
                      </div>

                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="font-medium text-gray-900 dark:text-white mb-2">
                          Kurze Pause: {state.preferences.pomodoro.shortBreakDuration} Min
                        </div>
                        <input
                          type="range"
                          min="3"
                          max="15"
                          step="1"
                          value={state.preferences.pomodoro.shortBreakDuration}
                          onChange={(e) => dispatch({
                            type: 'UPDATE_PREFERENCES',
                            payload: { 
                              pomodoro: { 
                                ...state.preferences.pomodoro, 
                                shortBreakDuration: parseInt(e.target.value) 
                              } 
                            }
                          })}
                          className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                        />
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <span>3</span>
                          <span>15</span>
                        </div>
                      </div>

                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="font-medium text-gray-900 dark:text-white mb-2">
                          Lange Pause: {state.preferences.pomodoro.longBreakDuration} Min
                        </div>
                        <input
                          type="range"
                          min="15"
                          max="30"
                          step="5"
                          value={state.preferences.pomodoro.longBreakDuration}
                          onChange={(e) => dispatch({
                            type: 'UPDATE_PREFERENCES',
                            payload: { 
                              pomodoro: { 
                                ...state.preferences.pomodoro, 
                                longBreakDuration: parseInt(e.target.value) 
                              } 
                            }
                          })}
                          className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                        />
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <span>15</span>
                          <span>30</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">Pausen automatisch starten</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Startet Pausen automatisch</div>
                        </div>
                        <Toggle 
                          enabled={state.preferences.pomodoro.autoStartBreaks} 
                          onChange={() => dispatch({
                            type: 'UPDATE_PREFERENCES',
                            payload: { 
                              pomodoro: { 
                                ...state.preferences.pomodoro, 
                                autoStartBreaks: !state.preferences.pomodoro.autoStartBreaks 
                              } 
                            }
                          })} 
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">Arbeit automatisch starten</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Startet Arbeitsphasen automatisch</div>
                        </div>
                        <Toggle 
                          enabled={state.preferences.pomodoro.autoStartWork} 
                          onChange={() => dispatch({
                            type: 'UPDATE_PREFERENCES',
                            payload: { 
                              pomodoro: { 
                                ...state.preferences.pomodoro, 
                                autoStartWork: !state.preferences.pomodoro.autoStartWork 
                              } 
                            }
                          })} 
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* White Noise Settings - only show when Pomodoro enabled */}
            {state.preferences.pomodoro.enabled && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">White Noise</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">White Noise aktivieren</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Hintergrundgeräusche während der Pomodoro-Sitzungen</div>
                  </div>
                  <Toggle 
                    enabled={state.preferences.pomodoro.whiteNoiseEnabled} 
                    onChange={() => dispatch({
                      type: 'UPDATE_PREFERENCES',
                      payload: { 
                        pomodoro: { 
                          ...state.preferences.pomodoro, 
                          whiteNoiseEnabled: !state.preferences.pomodoro.whiteNoiseEnabled 
                        } 
                      }
                    })} 
                  />
                </div>

                {state.preferences.pomodoro.whiteNoiseEnabled && (
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="font-medium text-gray-900 dark:text-white mb-3">Soundauswahl</div>
                      <div className="grid grid-cols-1 gap-3">
                        {[
                          { value: 'clock', label: 'Tickende Uhr', description: 'Rhythmisches Ticken einer Uhr' },
                          { value: 'none', label: 'Aus', description: 'Keine Hintergrundgeräusche' }
                        ].map((sound) => (
                          <div
                            key={sound.value}
                            className={`p-4 rounded-lg border text-sm transition-colors cursor-pointer ${
                              state.preferences.pomodoro.whiteNoiseType === sound.value
                                ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/10 text-[var(--accent-color)]'
                                : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                            onClick={() => dispatch({
                              type: 'UPDATE_PREFERENCES',
                              payload: { 
                                pomodoro: { 
                                  ...state.preferences.pomodoro, 
                                  whiteNoiseType: sound.value as any 
                                } 
                              }
                            })}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">{sound.label}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{sound.description}</div>
                              </div>
                              <div className="flex items-center space-x-2">
                                {state.preferences.pomodoro.whiteNoiseType === sound.value && (
                                  <Check className="w-4 h-4 text-[var(--accent-color)]" />
                                )}
                                {sound.value !== 'none' && (
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await testWhiteNoise(sound.value as any, state.preferences.pomodoro.whiteNoiseVolume);
                                    }}
                                    className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                    title="5 Sekunden testen"
                                  >
                                    <Play className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="font-medium text-gray-900 dark:text-white mb-3">
                        Lautstärke: {Math.round(state.preferences.pomodoro.whiteNoiseVolume * 100)}%
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={state.preferences.pomodoro.whiteNoiseVolume}
                        onChange={(e) => dispatch({
                          type: 'UPDATE_PREFERENCES',
                          payload: { 
                            pomodoro: { 
                              ...state.preferences.pomodoro, 
                              whiteNoiseVolume: parseFloat(e.target.value) 
                            } 
                          }
                        })}
                        className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>0%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Fokusmodus</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Fokusmodus aktivieren</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Ermöglicht die Nutzung des Fokusmodus für konzentriertes Arbeiten</div>
                  </div>
                  <Toggle 
                    enabled={state.preferences.enableFocusMode || false} 
                    onChange={() => dispatch({
                      type: 'UPDATE_PREFERENCES',
                      payload: { 
                        enableFocusMode: !state.preferences.enableFocusMode 
                      }
                    })} 
                  />
                </div>
              </div>
            </div>
            {/* Toggl Integration (moved from Integrationen) */}
            {renderTogglSection()}
          </div>
        );

      // integrations removed

      case 'toggl':
        return (
          <div className="space-y-8">
            {/* Toggl Status Header */}
            <div className="p-6 rounded-lg border" style={{ 
              background: `linear-gradient(135deg, ${state.preferences.accentColor}15, ${state.preferences.accentColor}05)`,
              borderColor: `${state.preferences.accentColor}40`
            }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    togglConnectionStatus === 'success' ? 'bg-green-100 dark:bg-green-900' :
                    togglConnectionStatus === 'error' ? 'bg-red-100 dark:bg-red-900' :
                    'bg-gray-100 dark:bg-gray-800'
                  }`}>
                    <Play className={`w-6 h-6 ${
                      togglConnectionStatus === 'success' ? 'text-green-600 dark:text-green-400' :
                      togglConnectionStatus === 'error' ? 'text-red-600 dark:text-red-400' :
                      'text-gray-600 dark:text-gray-400'
                    }`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Toggl Integration</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Status: {togglConnectionStatus === 'success' ? 'Verbunden' : 
                               togglConnectionStatus === 'error' ? 'Fehler' : 
                               togglConnectionStatus === 'testing' ? 'Wird getestet...' : 'Nicht konfiguriert'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Toggle 
                    enabled={togglEnabled} 
                    onChange={() => setTogglEnabled(!togglEnabled)} 
                  />
                </div>
              </div>
              {togglConnectionMessage && (
                <div className={`mt-4 p-3 rounded-lg ${
                  togglConnectionStatus === 'success' ? 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-200' :
                  togglConnectionStatus === 'error' ? 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-200' :
                  'bg-blue-50 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                }`}>
                  {togglConnectionMessage}
                </div>
              )}
            </div>

            {/* Configuration Guide */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Konfiguration</h3>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">i</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                      So konfigurieren Sie Toggl Track:
                    </h4>
                    <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-2 list-decimal list-inside">
                      <li>
                        Besuchen Sie{' '}
                        <a 
                          href="https://track.toggl.com/profile" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="underline hover:text-blue-600 dark:hover:text-blue-300"
                          style={{ color: state.preferences.accentColor }}
                        >
                          Ihr Toggl-Profil
                        </a>{' '}
                        und kopieren Sie Ihren API-Token
                      </li>
                      <li>Fügen Sie den API-Token unten ein und testen Sie die Verbindung</li>
                      <li>Wählen Sie Ihr Workspace aus der Liste</li>
                      <li>Optional: Wählen Sie ein Standard-Projekt für neue Einträge</li>
                      <li>Konfigurieren Sie die Synchronisationsoptionen nach Ihren Wünschen</li>
                    </ol>
                    <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700 space-y-2">
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        <strong>Hinweis:</strong> Alle Timer-Aktionen werden automatisch mit Toggl synchronisiert, 
                        wenn die Integration aktiviert ist. Sie können die Synchronisation für einzelne Aktionen 
                        in den erweiterten Einstellungen anpassen.
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        <strong>Wichtig:</strong> Die Toggl-Integration funktioniert aufgrund von Browser-Sicherheitseinschränkungen (CORS) 
                        möglicherweise nicht vollständig in der Web-Version. Für die beste Erfahrung verwenden Sie die Desktop-Version der App.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* API Configuration */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">API-Konfiguration</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    API-Token
                  </label>
                  <input
                    type="password"
                    value={togglApiToken}
                    onChange={(e) => setTogglApiToken(e.target.value)}
                    placeholder="Toggl API-Token eingeben"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800"
                    style={{ 
                      '--tw-ring-color': state.preferences.accentColor,
                      borderColor: state.preferences.accentColor + '40'
                    } as React.CSSProperties}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Finden Sie Ihren API-Token in Ihrem{' '}
                    <a 
                      href="https://track.toggl.com/profile" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="underline hover:opacity-80"
                      style={{ color: state.preferences.accentColor }}
                    >
                      Toggl-Profil
                    </a>{' '}
                    unter "API Token"
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Workspace
                  </label>
                  <select
                    value={togglWorkspaceId}
                    onChange={(e) => handleTogglWorkspaceChange(e.target.value)}
                    disabled={!togglApiToken || togglWorkspaces.length === 0}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 disabled:opacity-50"
                    style={{ 
                      '--tw-ring-color': state.preferences.accentColor,
                      borderColor: state.preferences.accentColor + '40'
                    } as React.CSSProperties}
                  >
                    <option value="">Workspace auswählen</option>
                    {togglWorkspaces.map((workspace) => (
                      <option key={workspace.id} value={workspace.id}>
                        {workspace.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Standard-Projekt (optional)
                  </label>
                  <select
                    value={togglDefaultProjectId}
                    onChange={(e) => setTogglDefaultProjectId(e.target.value)}
                    disabled={!togglWorkspaceId || togglProjects.length === 0}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 disabled:opacity-50"
                    style={{ 
                      '--tw-ring-color': state.preferences.accentColor,
                      borderColor: state.preferences.accentColor + '40'
                    } as React.CSSProperties}
                  >
                    <option value="">Kein Standard-Projekt</option>
                    {togglProjects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleTogglConnectionTest}
                  disabled={!togglApiToken || togglConnectionStatus === 'testing'}
                  className="px-4 py-2 rounded-md text-white font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  style={{ backgroundColor: state.preferences.accentColor }}
                >
                  {togglConnectionStatus === 'testing' ? (
                    <div className="flex items-center space-x-2">
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Wird getestet...</span>
                    </div>
                  ) : (
                    'Verbindung testen'
                  )}
                </button>
              </div>
            </div>

            {/* Sync Options */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Synchronisation</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Automatische Synchronisation</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Zeiten automatisch an Toggl senden</div>
                  </div>
                  <Toggle 
                    enabled={togglAutoSync} 
                    onChange={() => setTogglAutoSync(!togglAutoSync)} 
                    disabled={!togglEnabled}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Bei Timer-Start synchronisieren</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Timer-Start an Toggl senden</div>
                  </div>
                  <Toggle 
                    enabled={togglSyncOnStart} 
                    onChange={() => setTogglSyncOnStart(!togglSyncOnStart)} 
                    disabled={!togglEnabled}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Bei Timer-Pause synchronisieren</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Timer-Pause an Toggl senden</div>
                  </div>
                  <Toggle 
                    enabled={togglSyncOnPause} 
                    onChange={() => setTogglSyncOnPause(!togglSyncOnPause)} 
                    disabled={!togglEnabled}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Bei Timer-Stopp synchronisieren</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Timer-Stopp an Toggl senden</div>
                  </div>
                  <Toggle 
                    enabled={togglSyncOnStop} 
                    onChange={() => setTogglSyncOnStop(!togglSyncOnStop)} 
                    disabled={!togglEnabled}
                  />
                </div>
              </div>
            </div>

            {/* Advanced Options */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Erweiterte Optionen</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Projekte automatisch erstellen</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Neue Projekte in Toggl anlegen, wenn sie nicht existieren</div>
                  </div>
                  <Toggle 
                    enabled={togglCreateProjects} 
                    onChange={() => setTogglCreateProjects(!togglCreateProjects)} 
                    disabled={!togglEnabled}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Aufgabenbeschreibungen verwenden</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Aufgabenbeschreibung in Toggl-Eintrag einbeziehen</div>
                  </div>
                  <Toggle 
                    enabled={togglUseTaskDescriptions} 
                    onChange={() => setTogglUseTaskDescriptions(!togglUseTaskDescriptions)} 
                    disabled={!togglEnabled}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Zeit auf Minuten runden</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Zeiten auf ganze Minuten runden</div>
                  </div>
                  <Toggle 
                    enabled={togglRoundTime} 
                    onChange={() => setTogglRoundTime(!togglRoundTime)} 
                    disabled={!togglEnabled}
                  />
                </div>
              </div>
            </div>

            {/* Last Sync Info */}
            {state.preferences.toggl?.lastSync && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Letzte Synchronisation: {new Date(state.preferences.toggl.lastSync).toLocaleString('de-DE')}
                </div>
              </div>
            )}

            {/* Diagnostics Section */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">🔍 Problemdiagnose</h4>
              <div className="flex space-x-3">
                <button
                  onClick={async () => {
                    try {
                      const { togglService } = await import('../../utils/togglService');
                      togglService.updatePreferences(state.preferences);
                      const diagnostics = await togglService.runDiagnostics();
                      
                      console.log('🔍 Toggl Diagnostics:', diagnostics);
                      
                      let message = '🔍 Toggl Diagnose-Ergebnis:\n\n';
                      
                      message += `📡 Verbindung: ${diagnostics.connection.success ? '✅' : '❌'} ${diagnostics.connection.message}\n`;
                      message += `⚙️ Konfiguration: ${diagnostics.config.valid ? '✅' : '❌'} ${diagnostics.config.issues.join(', ')}\n`;
                      message += `🔐 Berechtigung: ${diagnostics.permissions.valid ? '✅' : '❌'} ${diagnostics.permissions.message}\n\n`;
                      
                      if (diagnostics.recommendations.length > 0) {
                        message += '💡 Empfehlungen:\n';
                        diagnostics.recommendations.forEach(rec => {
                          message += `• ${rec}\n`;
                        });
                      }
                      
                      alert(message);
                    } catch (error) {
                      console.error('Diagnostics failed:', error);
                      alert('❌ Diagnose fehlgeschlagen: ' + (error instanceof Error ? error.message : 'Unbekannter Fehler'));
                    }
                  }}
                  className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  🔍 Diagnose starten
                </button>
                
                <button
                  onClick={() => {
                                         console.log('🔍 Toggl Debug Info:', {
                       enabled: togglEnabled,
                       apiToken: togglApiToken ? '[GESETZT]' : '[NICHT GESETZT]',
                       workspaceId: togglWorkspaceId,
                       defaultProjectId: togglDefaultProjectId,
                       syncOnStart: togglSyncOnStart,
                       syncOnPause: togglSyncOnPause,
                       syncOnStop: togglSyncOnStop,
                       autoSync: togglAutoSync,
                       lastSync: (state.preferences.toggl as any)?.lastSync || 'Nie'
                     });
                    alert('🔍 Debug-Informationen wurden in die Konsole ausgegeben (F12 → Console)');
                  }}
                  className="px-4 py-2 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                >
                  🐛 Debug-Info,
  Target
                </button>
                
                <button
                  onClick={async () => {
                    try {
                      console.log('🧪 Testing Toggl Timer Start...');
                      
                      // Check prerequisites
                      if (!togglEnabled) {
                        alert('❌ Toggl Integration ist nicht aktiviert');
                        return;
                      }
                      
                      if (!togglApiToken) {
                        alert('❌ Toggl API-Token fehlt');
                        return;
                      }
                      
                      if (!togglWorkspaceId) {
                        alert('❌ Toggl Workspace-ID fehlt');
                        return;
                      }
                      
                      if (!togglSyncOnStart) {
                        alert('⚠️ "Timer-Start synchronisieren" ist deaktiviert. Aktivieren Sie diese Option.');
                        return;
                      }
                      
                      // Test timer start
                      const { togglService } = await import('../../utils/togglService');
                      togglService.updatePreferences(state.preferences);
                      
                      console.log('🔵 Starting test timer entry...');
                      
                      const timeEntry = await togglService.startTimeEntry(
                        parseInt(togglWorkspaceId),
                        'TaskFuchs Test Timer',
                        togglDefaultProjectId ? parseInt(togglDefaultProjectId) : undefined,
                        ['test']
                      );
                      
                      console.log('✅ Test timer started successfully:', timeEntry);
                      alert(`✅ Test-Timer erfolgreich gestartet!\nTimer ID: ${timeEntry.id}\nBeschreibung: ${timeEntry.description}\n\n⚠️ Bitte stoppen Sie den Timer manuell in Toggl!`);
                      
                    } catch (error) {
                      console.error('❌ Test timer failed:', error);
                      let errorMessage = 'Unbekannter Fehler';
                      
                      if (error instanceof Error) {
                        errorMessage = error.message;
                        if (error.message.includes('CORS')) {
                          errorMessage += '\n\n💡 CORS-Problem: Funktioniert möglicherweise nur in der Desktop-Version';
                        } else if (error.message.includes('401') || error.message.includes('403')) {
                          errorMessage += '\n\n💡 API-Token ungültig oder Berechtigung fehlt';
                        } else if (error.message.includes('400')) {
                          errorMessage += '\n\n💡 Ungültige Anfrage - prüfen Sie Workspace-ID und Projekt-ID';
                        }
                      }
                      
                      alert(`❌ Test-Timer Fehler:\n${errorMessage}`);
                    }
                  }}
                  className="px-4 py-2 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                >
                  🧪 Timer-Start testen
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Verwenden Sie die Diagnose-Funktion, um Toggl-Verbindungsprobleme zu identifizieren.
              </p>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleTogglSaveSettings}
                className="px-6 py-2 rounded-md text-white font-medium transition-all duration-200 hover:scale-105"
                style={{ backgroundColor: state.preferences.accentColor }}
              >
                Einstellungen speichern
              </button>
            </div>
          </div>
        );

      case 'caldav':
        return (
          <div className="space-y-8">
            {/* Header */}
            <div className="p-6 rounded-lg border" style={{ 
              background: `linear-gradient(135deg, ${state.preferences.accentColor}15, ${state.preferences.accentColor}05)`,
              borderColor: `${state.preferences.accentColor}40`
            }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    caldavConnectionStatus === 'success' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'
                  }`}>
                    <Smartphone className={`w-6 h-6 ${
                      caldavConnectionStatus === 'success' ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
                    }`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      CalDAV Synchronisation
                    </h3>
                    <div className="flex items-center space-x-2 text-sm">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        caldavConnectionStatus === 'success' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : caldavConnectionStatus === 'testing'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {caldavConnectionStatus === 'success' ? 'Verbunden' : 
                         caldavConnectionStatus === 'testing' ? 'Teste...' : 'Nicht verbunden'}
                      </span>
                      {state.preferences.caldav?.lastSync && (
                        <span className="text-gray-500 dark:text-gray-400">
                          Letzte Sync: {new Date(state.preferences.caldav.lastSync).toLocaleString('de-DE')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Toggle enabled={caldavEnabled} onChange={() => {
                    const newEnabled = !caldavEnabled;
                    setCaldavEnabled(newEnabled);
                    // Sofort speichern
                    handleCalDAVSettingsChange({ enabled: newEnabled });
                  }} />
                </div>
              </div>
            </div>

            {/* Connection Settings */}
            <div className="space-y-6">
              <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Verbindungseinstellungen
                </h4>

                {/* 🚨 SUPER VISIBLE CALENDAR SELECTION - ALWAYS ON TOP 🚨 */}
                <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 border-4 border-red-500 rounded-lg">
                  <h2 className="text-2xl font-bold text-red-800 dark:text-red-200 mb-3 text-center">
                    🚨 KALENDERAUSWAHL - DEBUGGING 🚨
                  </h2>
                  <div className="space-y-3">
                    <div className="text-sm font-mono bg-white dark:bg-gray-800 p-3 rounded border">
                      <div>🔍 Status: {caldavConnectionStatus || 'undefined'}</div>
                      <div>📊 Loading: {caldavCalendarsLoading ? 'true' : 'false'}</div>
                      <div>📅 Calendars: {caldavCalendars.length}</div>
                      <div>💬 Message: {caldavConnectionMessage || 'keine'}</div>
                      <div>✅ Selected: {caldavCalendarUrl || 'keiner'}</div>
                    </div>
                    
                    {caldavCalendars.length > 0 ? (
                      <div>
                        <div className="font-bold text-green-800 dark:text-green-200 mb-2 text-lg">
                          📅 GEFUNDENE KALENDER ({caldavCalendars.length}):
                        </div>
                        <div className="space-y-2">
                          {caldavCalendars.map((calendar, index) => (
                            <label key={calendar.url} className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 rounded border-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                              <input
                                type="radio"
                                name="debug-calendar-selection"
                                value={calendar.url}
                                checked={caldavCalendarUrl === calendar.url}
                                onChange={(e) => {
                                  console.log('🔥 CALENDAR SELECTED:', e.target.value);
                                  setCaldavCalendarUrl(e.target.value);
                                }}
                                className="w-6 h-6 text-red-600"
                              />
                              <div className="flex-1">
                                <div className="font-bold text-gray-900 dark:text-white text-lg">
                                  {index + 1}. {calendar.displayName}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  URL: {calendar.url}
                                </div>
                                <div className="text-sm text-blue-600 dark:text-blue-400">
                                  {calendar.todoCount !== undefined ? `${calendar.todoCount} Todos` : 'Todo-Anzahl unbekannt'}
                                </div>
                              </div>
                              {caldavCalendarUrl === calendar.url && (
                                <span className="text-green-600 font-bold text-xl">✅ AUSGEWÄHLT</span>
                              )}
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-red-800 dark:text-red-200 font-bold text-lg text-center p-4 bg-yellow-100 dark:bg-yellow-900 rounded">
                        ❌ KEINE KALENDER GEFUNDEN - Teste zuerst die Verbindung!
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Server-URL
                      </label>
                      <input
                        type="url"
                        value={caldavServerUrl}
                        onChange={(e) => setCaldavServerUrl(e.target.value)}
                        placeholder="https://speicher.diewolke.org"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        disabled={!caldavEnabled}
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Die Basis-URL Ihres Servers (ohne /remote.php/dav)
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Kalender-URL (Web-Link oder CalDAV-URL)
                      </label>
                      <input
                        type="url"
                        value={caldavCalendarUrl}
                        onChange={(e) => {
                          const value = e.target.value;
                          setCaldavCalendarUrl(value);
                          
                          // Auto-convert Nextcloud web calendar links to CalDAV URLs
                          if (value.includes('/apps/calendar/p/')) {
                            const match = value.match(/^(https?:\/\/[^\/]+)\/apps\/calendar\/p\/([^\/\?]+)/);
                            if (match) {
                              const [, serverUrl, token] = match;
                              const caldavUrl = `${serverUrl}/remote.php/dav/public-calendars/${token}/`;
                              console.log('🔄 Auto-converting web calendar link to CalDAV URL:', caldavUrl);
                              setTimeout(() => setCaldavCalendarUrl(caldavUrl), 100);
                            }
                          }
                        }}
                        placeholder="https://speicher.diewolke.org/apps/calendar/p/kr5jCESMgMta7kir ODER CalDAV-URL"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        disabled={!caldavEnabled}
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        💡 Tipp: Nextcloud Web-Links werden automatisch zu CalDAV-URLs konvertiert
                      </p>
                      
                      {/* Smart conversion helper */}
                      {caldavCalendarUrl.includes('/apps/calendar/p/') && (
                        <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="flex items-start space-x-2">
                            <div className="w-4 h-4 mt-0.5 text-blue-600 dark:text-blue-400">🔄</div>
                            <div className="text-sm text-blue-800 dark:text-blue-200">
                              <div className="font-medium mb-1">Web-Link erkannt!</div>
                              <div>Wird automatisch zu CalDAV-URL konvertiert...</div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* 🎯 DIRECT CALENDAR TEST BUTTON */}
                      {caldavCalendarUrl && caldavCalendarUrl.includes('/dav/') && (
                        <div className="mt-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-medium text-green-800 dark:text-green-200">
                                🎯 Direkter Kalender-Test
                              </div>
                              <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                                Teste diese CalDAV-URL direkt
                              </div>
                            </div>
                            <button
                              onClick={async () => {
                                                                 console.log('🚀 DIRECT CALENDAR TEST:', caldavCalendarUrl);
                                 setCaldavConnectionStatus('testing');
                                 setCaldavConnectionMessage('🎯 Teste direkten Kalender...');
                                 
                                 try {
                                   // Import CalDAVService dynamically
                                   const { CalDAVService } = await import('../../utils/caldavService');
                                   
                                   const service = new CalDAVService({
                                     serverUrl: caldavServerUrl,
                                     username: caldavUsername,
                                     password: caldavPassword,
                                     calendarUrl: caldavCalendarUrl,
                                     connected: false
                                   });
                                  
                                  console.log('📡 Calling getCalendars() with direct URL...');
                                  const calendars = await service.getCalendars();
                                  
                                  if (calendars.length > 0) {
                                    console.log('✅ DIRECT TEST SUCCESS! Found calendars:', calendars);
                                    setCaldavCalendars(calendars);
                                    setCaldavConnectionStatus('success');
                                    setCaldavConnectionMessage(`✅ Direkter Test erfolgreich! Kalender gefunden: "${calendars[0].displayName}"`);
                                  } else {
                                    throw new Error('Kein Kalender an dieser URL gefunden');
                                  }
                                } catch (error) {
                                  console.error('❌ DIRECT CALENDAR TEST FAILED:', error);
                                  setCaldavConnectionStatus('error');
                                  setCaldavConnectionMessage(`❌ Direkter Test fehlgeschlagen: ${error.message}`);
                                }
                              }}
                                                             className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-medium"
                               disabled={caldavConnectionStatus === 'testing'}
                             >
                               {caldavConnectionStatus === 'testing' ? '⏳ Teste...' : '🎯 SOFORT TESTEN'}
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {/* URL-Vorschläge für speicher.diewolke.org */}
                      {caldavServerUrl.includes('speicher.diewolke.org') && (
                        <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                          <div className="text-sm">
                            <div className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                              💡 Empfohlene URLs für speicher.diewolke.org:
                            </div>
                            <div className="space-y-1">
                              <button
                                onClick={() => setCaldavServerUrl('https://speicher.diewolke.org/remote.php/dav')}
                                className="block w-full text-left px-2 py-1 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800 rounded text-xs font-mono"
                              >
                                https://speicher.diewolke.org/remote.php/dav
                              </button>
                              <button
                                onClick={() => setCaldavServerUrl('https://speicher.diewolke.org/remote.php/caldav')}
                                className="block w-full text-left px-2 py-1 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800 rounded text-xs font-mono"
                              >
                                https://speicher.diewolke.org/remote.php/caldav
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Benutzername
                      </label>
                      <input
                        type="text"
                        value={caldavUsername}
                        onChange={(e) => setCaldavUsername(e.target.value)}
                        placeholder="username"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        disabled={!caldavEnabled}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Passwort
                      </label>
                      <div className="relative">
                        <input
                          type={showCaldavPassword ? 'text' : 'password'}
                          value={caldavPassword}
                          onChange={(e) => setCaldavPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          disabled={!caldavEnabled}
                        />
                        <button
                          type="button"
                          onClick={() => setShowCaldavPassword(!showCaldavPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          disabled={!caldavEnabled}
                        >
                          {showCaldavPassword ? (
                            <EyeOff className="w-4 h-4 text-gray-400" />
                          ) : (
                            <Eye className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Kalender-URL (optional)
                      </label>
                      <input
                        type="url"
                        value={caldavCalendarUrl}
                        onChange={(e) => setCaldavCalendarUrl(e.target.value)}
                        placeholder="Wird automatisch erkannt"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        disabled={!caldavEnabled}
                      />
                    </div>
                  </div>

                  {/* Connection Test */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={handleCalDAVConnectionTest}
                        disabled={!caldavEnabled || caldavConnectionStatus === 'testing'}
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
                      >
                        {caldavConnectionStatus === 'testing' ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Teste...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            <span>Verbindung testen</span>
                          </>
                        )}
                      </button>

                      {caldavConnectionMessage && (
                        <div className={`text-sm ${
                          caldavConnectionStatus === 'success' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {caldavConnectionMessage}
                        </div>
                      )}
                    </div>

                    {/* Development CORS Info */}
                    {window.location.origin.includes('localhost') && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                        <div className="flex items-start space-x-2">
                          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                          <div className="text-sm text-blue-800 dark:text-blue-200">
                            <div className="font-medium mb-1">🛠️ Entwicklungsmodus</div>
                            <div>CORS-Proxy wird automatisch bei Verbindungsproblemen verwendet. Prüfen Sie die Konsole (F12) für Details.</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Debug-Hinweis */}
                    {caldavConnectionStatus === 'error' && (
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                        <div className="flex items-start space-x-2">
                          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                          <div className="text-sm">
                            <div className="font-medium text-red-800 dark:text-red-200 mb-1">
                              Verbindung fehlgeschlagen
                            </div>
                            <div className="text-red-700 dark:text-red-300 space-y-1">
                              <div>• Öffnen Sie die Browser-Konsole (F12) für detaillierte Diagnose-Informationen</div>
                              <div>• Prüfen Sie die Netzwerk-Registerkarte auf blockierte Anfragen</div>
                              <div>• CORS-Proxy wird automatisch versucht (in Entwicklungsumgebung)</div>
                              <div>• Häufige Ursachen: SSL-Zertifikate, Firewall, falsche Credentials</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CORS-Lösungen */}
                    {caldavConnectionStatus === 'error' && caldavConnectionMessage.includes('CORS') && (
                      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                        <div className="flex items-start space-x-2">
                          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                          <div className="text-sm">
                            <div className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                              🚫 CORS-Problem erkannt - Lösungsansätze:
                            </div>
                            <div className="space-y-2">
                              <div className="font-medium text-yellow-800 dark:text-yellow-200">
                                1. Empfohlen: Desktop-App verwenden
                              </div>
                              <div className="text-yellow-700 dark:text-yellow-300">
                                Die Desktop-Version hat keine CORS-Beschränkungen und funktioniert direkt mit Ihrem Nextcloud-Server.
                              </div>
                              
                              <div className="font-medium text-yellow-800 dark:text-yellow-200">
                                2. Direkte CalDAV-URLs verwenden
                              </div>
                              <div className="text-yellow-700 dark:text-yellow-300">
                                Verwenden Sie den vollständigen CalDAV-Pfad:
                                <div className="mt-1 font-mono text-xs bg-yellow-100 dark:bg-yellow-800 p-1 rounded">
                                  https://speicher.diewolke.org/remote.php/dav/
                                </div>
                              </div>
                              
                              <div className="font-medium text-yellow-800 dark:text-yellow-200">
                                3. App-Passwort erstellen
                              </div>
                              <div className="text-yellow-700 dark:text-yellow-300">
                                Gehen Sie zu Nextcloud → Einstellungen → Sicherheit → "Neues App-Passwort generieren"
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Available Calendars - ALWAYS VISIBLE FOR DEBUGGING */}
                  {true && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        📅 Kalender für Synchronisation auswählen
                      </label>
                      
                      {/* Enhanced Debug Info */}
                      <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded text-xs font-mono space-y-1">
                        <div>🔍 Debug: Status={caldavConnectionStatus}, Loading={caldavCalendarsLoading ? 'true' : 'false'}, Calendars={caldavCalendars.length}</div>
                        <div>💬 Message: {caldavConnectionMessage}</div>
                        <div>🎯 Calendar Selection Visible: {(caldavConnectionStatus === 'success' || caldavCalendars.length > 0) ? 'YES' : 'NO'}</div>
                        {caldavCalendars.length > 0 && <div>📅 Found: {caldavCalendars.map(c => c.displayName || c.name).join(', ')}</div>}
                        {caldavCalendarUrl && <div>✅ Selected: {caldavCalendarUrl}</div>}
                      </div>
                      
                      {!caldavCalendarUrl && caldavCalendars.length > 0 && (
                        <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                              Bitte wählen Sie einen Kalender aus, um die CalDAV-Synchronisation zu aktivieren
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* Calendar List with ALWAYS VISIBLE fallback */}
                      <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
                        {caldavCalendarsLoading ? (
                          <div className="flex items-center justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">Lade Kalender...</span>
                          </div>
                        ) : caldavCalendars.length === 0 ? (
                          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                            <div className="mb-2">⏳ Kalender werden geladen...</div>
                            <div className="text-xs">Status: {caldavConnectionStatus}</div>
                            <div className="text-xs">Falls keine Kalender erscheinen, prüfen Sie die Browser-Konsole (F12) für Details.</div>
                          </div>
                        ) : (
                          <div className="space-y-0">
                            {caldavCalendars.map((calendar) => (
                              <div key={calendar.url} className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700/60 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors">
                                <input
                                  type="radio"
                                  id={`calendar-${calendar.name}`}
                                  name="caldav-calendar"
                                  value={calendar.url}
                                  checked={caldavCalendarUrl === calendar.url}
                                  onChange={(e) => {
                                    console.log('📅 Calendar selected:', e.target.value);
                                    setCaldavCalendarUrl(e.target.value);
                                  }}
                                  className="mr-3 focus:ring-2 focus:ring-blue-500 h-4 w-4 text-blue-600"
                                />
                                <label htmlFor={`calendar-${calendar.name}`} className="flex-1 cursor-pointer">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      {calendar.color && (
                                        <div 
                                          className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600 flex-shrink-0"
                                          style={{ backgroundColor: calendar.color }}
                                        />
                                      )}
                                      <div className="font-medium text-gray-900 dark:text-white">{calendar.displayName}</div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      {calendar.todoCount !== undefined && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                          {calendar.todoCount} {calendar.todoCount === 1 ? 'Todo' : 'Todos'}
                                        </span>
                                      )}
                                      {caldavCalendarUrl === calendar.url && (
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {calendar.description || calendar.name}
                                  </div>
                                  {calendar.lastModified && (
                                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                      Zuletzt geändert: {new Date(calendar.lastModified).toLocaleString('de-DE')}
                                    </div>
                                  )}
                                </label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* Auto-select helper */}
                      {!caldavCalendarUrl && caldavCalendars.length > 0 && (
                        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center space-x-2">
                            <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm text-blue-800 dark:text-blue-200">
                              Bitte wählen Sie einen Kalender aus oder 
                              <button 
                                onClick={() => {
                                  console.log('📅 Auto-selecting first calendar:', caldavCalendars[0].url);
                                  setCaldavCalendarUrl(caldavCalendars[0].url);
                                }}
                                className="ml-1 text-blue-600 dark:text-blue-400 underline hover:no-underline font-medium"
                              >
                                ersten Kalender verwenden
                              </button>
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* Success indicator when calendar is selected */}
                      {caldavCalendarUrl && caldavCalendars.length > 0 && (
                        <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                            <span className="text-sm font-medium text-green-800 dark:text-green-200">
                              ✅ Kalender ausgewählt! CalDAV-Synchronisation ist jetzt aktiv.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* No calendars found */}
                  {caldavConnectionStatus === 'success' && caldavCalendars.length === 0 && !caldavCalendarsLoading && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
                      <div className="flex items-start space-x-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                            🔍 Keine Kalender mit Todo-Unterstützung gefunden
                          </div>
                          <div className="text-xs text-amber-700 dark:text-amber-300 space-y-2">
                            <div>
                              <span className="font-medium">Mögliche Ursachen:</span>
                            </div>
                            <ul className="list-disc list-inside space-y-1 ml-2">
                              <li>Kalender-App in Nextcloud nicht aktiviert</li>
                              <li>Keine Kalender erstellt</li>
                              <li>CalDAV-URL zeigt nicht auf den Kalender-Bereich</li>
                              <li>Nextcloud-Version verwendet andere CalDAV-Struktur</li>
                            </ul>
                            <div className="mt-3">
                              <span className="font-medium">Lösungsansätze:</span>
                            </div>
                            <ol className="list-decimal list-inside space-y-1 ml-2">
                              <li>Prüfen Sie die Browser-Konsole (F12) auf detaillierte Logs</li>
                              <li>Für Nextcloud: Verwenden Sie <code className="bg-amber-100 dark:bg-amber-800 px-1 rounded text-xs">https://ihr-server/remote.php/dav/</code></li>
                              <li>Loggen Sie sich in Nextcloud ein und gehen Sie zu "Kalender"</li>
                              <li>Erstellen Sie einen neuen Kalender falls noch keiner existiert</li>
                              <li>Stellen Sie sicher, dass die Kalender-App aktiviert ist</li>
                              <li>Verwenden Sie ein App-Passwort (nicht Ihr normales Passwort)</li>
                            </ol>
                            <div className="mt-3 p-2 bg-amber-100 dark:bg-amber-800 rounded">
                              <div className="font-medium text-amber-900 dark:text-amber-100 text-xs">
                                💡 Debug-Tipp: Öffnen Sie die Browser-Entwicklertools (F12) → Konsole, 
                                um detaillierte Informationen über die gefundenen Kalender zu sehen.
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Loading indicator */}
                  {caldavCalendarsLoading && (
                    <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                      <span className="text-sm">Lade Kalender...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Sync Settings */}
              <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Synchronisationseinstellungen
                </h4>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">Automatische Synchronisation</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Änderungen automatisch synchronisieren</div>
                    </div>
                    <Toggle 
                      enabled={caldavAutoSync} 
                      onChange={() => setCaldavAutoSync(!caldavAutoSync)} 
                      disabled={!caldavEnabled}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">Sync beim Start</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Beim App-Start synchronisieren</div>
                    </div>
                    <Toggle 
                      enabled={caldavSyncOnStart} 
                      onChange={() => setCaldavSyncOnStart(!caldavSyncOnStart)} 
                      disabled={!caldavEnabled}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">Sync bei Aufgaben-Änderungen</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Sofort synchronisieren wenn sich Aufgaben ändern</div>
                    </div>
                    <Toggle 
                      enabled={caldavSyncOnTaskChange} 
                      onChange={() => setCaldavSyncOnTaskChange(!caldavSyncOnTaskChange)} 
                      disabled={!caldavEnabled}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">Bidirektionale Synchronisation</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Änderungen in beide Richtungen synchronisieren</div>
                    </div>
                    <Toggle 
                      enabled={caldavBidirectionalSync} 
                      onChange={() => setCaldavBidirectionalSync(!caldavBidirectionalSync)} 
                      disabled={!caldavEnabled}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Sync-Intervall (Minuten)
                    </label>
                    <input
                      type="number"
                      value={caldavSyncInterval}
                      onChange={(e) => setCaldavSyncInterval(parseInt(e.target.value) || 30)}
                      min="5"
                      max="1440"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      disabled={!caldavEnabled}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Konfliktauflösung
                    </label>
                    <select
                      value={caldavConflictResolution}
                      onChange={(e) => setCaldavConflictResolution(e.target.value as 'local' | 'remote' | 'manual')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      disabled={!caldavEnabled}
                    >
                      <option value="manual">Manuell entscheiden</option>
                      <option value="local">Lokale Version bevorzugen</option>
                      <option value="remote">Remote-Version bevorzugen</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Sync Actions */}
              {caldavEnabled && caldavConnectionStatus === 'success' && (
                <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Synchronisation
                  </h4>
                  
                  <div className="space-y-4">
                    <button
                      onClick={handleCalDAVSync}
                      disabled={caldavIsSyncing}
                      className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {caldavIsSyncing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Synchronisiere... {Math.round(caldavSyncProgress)}%</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4" />
                          <span>Jetzt synchronisieren</span>
                        </>
                      )}
                    </button>

                    {/* Last Sync Information */}
                    {(state.preferences.caldav?.lastSync || state.preferences.caldav?.lastSyncStatus) && (
                      <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${
                              state.preferences.caldav?.lastSyncStatus === 'success' 
                                ? 'bg-green-500' 
                                : state.preferences.caldav?.lastSyncStatus === 'error'
                                ? 'bg-red-500'
                                : 'bg-yellow-500'
                            }`} />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Letzter Sync:
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {state.preferences.caldav?.lastSync 
                              ? new Date(state.preferences.caldav.lastSync).toLocaleString('de-DE')
                              : 'Nie'
                            }
                          </div>
                        </div>
                        {state.preferences.caldav?.lastSyncStatus === 'error' && state.preferences.caldav?.lastSyncError && (
                          <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                            Fehler: {state.preferences.caldav.lastSyncError}
                          </div>
                        )}
                      </div>
                    )}

                    {caldavIsSyncing && (
                      <div className="space-y-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${caldavSyncProgress}%` }}
                          />
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {caldavSyncMessage}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Troubleshooting Help */}
              <div className="p-6 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <h4 className="text-lg font-medium text-amber-900 dark:text-amber-100 mb-4 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Problembehebung
                </h4>
                
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="font-medium text-amber-900 dark:text-amber-100 mb-1">
                      Häufige Probleme und Lösungen:
                    </div>
                    <ul className="space-y-2 text-amber-800 dark:text-amber-200">
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-amber-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                        <div>
                          <strong>"Load failed" / "Netzwerkfehler":</strong> Browser kann Server nicht erreichen. Prüfen Sie die Server-URL (muss https:// verwenden), Internetverbindung und Firewall.
                        </div>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-amber-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                        <div>
                          <strong>CORS-Fehler:</strong> Browser blockiert Anfrage. Verwenden Sie ein App-Passwort in Nextcloud oder aktivieren Sie CORS für Ihren Server.
                        </div>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-amber-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                        <div>
                          <strong>SSL-Zertifikat-Fehler:</strong> Selbst-signierte Zertifikate können in Browsern blockiert werden. Akzeptieren Sie das Zertifikat manuell im Browser.
                        </div>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-amber-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                        <div>
                          <strong>Authentifizierung fehlgeschlagen:</strong> Überprüfen Sie Benutzername und Passwort. Verwenden Sie ein App-Passwort statt des Hauptpassworts.
                        </div>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-amber-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                        <div>
                          <strong>Server nicht erreichbar:</strong> Stellen Sie sicher, dass die Server-URL korrekt ist und HTTPS verwendet wird.
                        </div>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-amber-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                        <div>
                          <strong>Timeout-Fehler:</strong> Überprüfen Sie Ihre Internetverbindung und Firewall-Einstellungen.
                        </div>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-amber-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                        <div>
                          <strong>Keine Kalender gefunden:</strong> Stellen Sie sicher, dass in Nextcloud die Kalender-App aktiviert ist.
                        </div>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="border-t border-amber-200 dark:border-amber-800 pt-3">
                    <div className="font-medium text-amber-900 dark:text-amber-100 mb-2">
                      Typische Nextcloud-URLs:
                    </div>
                    <div className="space-y-1 text-amber-800 dark:text-amber-200 font-mono text-xs">
                      <div>• https://ihr-server.com/nextcloud</div>
                      <div>• https://nextcloud.example.com</div>
                      <div>• https://cloud.example.com</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleCalDAVSaveSettings}
                  className="px-6 py-2 rounded-md text-white font-medium transition-all duration-200 hover:scale-105"
                  style={{ backgroundColor: state.preferences.accentColor }}
                >
                  Einstellungen speichern
                </button>
              </div>
            </div>
          </div>
        );

      case 'ical':
        return (
          <div className="space-y-8">
            {/* Header */}
            <div className="p-6 rounded-lg border" style={{ 
              background: `linear-gradient(135deg, ${state.preferences.accentColor}15, ${state.preferences.accentColor}05)`,
              borderColor: `${state.preferences.accentColor}40`
            }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      iCal Import
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Importiere Kalender über iCal-URLs (z.B. Google Calendar, Outlook)
                    </p>
                  </div>
                </div>
                <Toggle enabled={icalEnabled} onChange={() => {
                  const newEnabled = !icalEnabled;
                  setIcalEnabled(newEnabled);
                  dispatch({ 
                    type: 'UPDATE_PREFERENCES', 
                    payload: { 
                      calendars: { 
                        ...state.preferences.calendars,
                        showInPlanner: newEnabled 
                      } 
                    } 
                  });
                }} />
              </div>
            </div>

            {icalEnabled && (
              <>
                {/* Add Calendar Source */}
                <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h4 className="text-base font-medium text-gray-900 dark:text-white mb-4">
                    Neuen Kalender hinzufügen
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Kalender-Name
                      </label>
                      <input
                        type="text"
                        value={newIcalName}
                        onChange={(e) => setNewIcalName(e.target.value)}
                        placeholder="z.B. Mein Google Kalender"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2"
                        style={{ '--tw-ring-color': state.preferences.accentColor } as any}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        iCal-URL
                      </label>
                      <input
                        type="url"
                        value={newIcalUrl}
                        onChange={(e) => {
                          setNewIcalUrl(e.target.value);
                          // Clear previous test results when URL changes
                          setIcalErrors({});
                          setIcalTestResults({});
                        }}
                        placeholder="https://calendar.google.com/calendar/ical/..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2"
                        style={{ '--tw-ring-color': state.preferences.accentColor } as any}
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Google Calendar: Einstellungen → Kalender teilen → Geheime Adresse im iCal-Format
                      </p>
                    </div>
                    
                    <div className="flex space-x-3">
                      <button
                        onClick={async () => {
                          if (!newIcalUrl.trim()) return;
                          
                          setIcalTestingUrl(newIcalUrl);
                          setIcalErrors({});
                          setIcalTestResults({});
                          
                          try {
                            const result = await ICalService.getInstance().testCalendarUrl(newIcalUrl);
                            if (result.success) {
                              // Test successful
                              setIcalTestResults({ 
                                [newIcalUrl]: { 
                                  success: true, 
                                  message: 'Verbindung erfolgreich! Kalender ist erreichbar.' 
                                } 
                              });
                              setIcalErrors({});
                            } else {
                              setIcalErrors({ [newIcalUrl]: result.error || 'Unbekannter Fehler' });
                              setIcalTestResults({});
                            }
                          } catch (error) {
                            setIcalErrors({ [newIcalUrl]: error.message });
                            setIcalTestResults({});
                          } finally {
                            setIcalTestingUrl(null);
                          }
                        }}
                        disabled={!newIcalUrl.trim() || icalTestingUrl === newIcalUrl}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                      >
                        {icalTestingUrl === newIcalUrl ? (
                          <span className="flex items-center space-x-2">
                            <Loader className="w-4 h-4 animate-spin" />
                            <span>Teste...</span>
                          </span>
                        ) : (
                          'URL testen'
                        )}
                      </button>
                      
                      <button
                        onClick={() => {
                          if (!newIcalName.trim() || !newIcalUrl.trim()) return;
                          
                          const colors = ICalService.getDefaultColors();
                          const newSource: CalendarSource = {
                            id: Date.now().toString(),
                            name: newIcalName.trim(),
                            url: newIcalUrl.trim(),
                            color: colors[icalSources.length % colors.length],
                            enabled: true,
                            syncInterval: 60, // 1 hour
                          };
                          
                          const updatedSources = [...icalSources, newSource];
                          setIcalSources(updatedSources);
                          dispatch({ type: 'ADD_CALENDAR_SOURCE', payload: newSource });
                          
                          // Clear form
                          setNewIcalName('');
                          setNewIcalUrl('');
                          setIcalErrors({});
                          setIcalTestResults({});
                        }}
                        disabled={!newIcalName.trim() || !newIcalUrl.trim()}
                        className="px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50"
                        style={{ backgroundColor: state.preferences.accentColor }}
                      >
                        <span className="flex items-center space-x-2">
                          <Plus className="w-4 h-4" />
                          <span>Hinzufügen</span>
                        </span>
                      </button>
                    </div>
                    
                    {icalErrors[newIcalUrl] && (
                      <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="text-sm text-red-600 dark:text-red-400">
                          ❌ {icalErrors[newIcalUrl]}
                        </p>
                      </div>
                    )}
                    
                    {icalTestResults[newIcalUrl]?.success && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
                        <p className="text-sm text-green-600 dark:text-green-400">
                          ✅ {icalTestResults[newIcalUrl].message}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Calendar Sources List */}
                <div className="space-y-4">
                  <h4 className="text-base font-medium text-gray-900 dark:text-white">
                    Kalender-Quellen ({icalSources.length})
                  </h4>
                  
                  {icalSources.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>Noch keine Kalender hinzugefügt</p>
                      <p className="text-sm">Fügen Sie oben einen Kalender hinzu, um Events zu importieren.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {icalSources.map((source) => (
                        <div key={source.id} className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div 
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: source.color }}
                              />
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {source.name}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {source.url}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {source.lastSync ? (
                                    <>Letzte Sync: {new Date(source.lastSync).toLocaleString('de-DE')}</>
                                  ) : (
                                    <span className="text-gray-400">Noch nicht synchronisiert</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={async () => {
                                  setIcalSyncingSource(source.id);
                                  setIcalErrors({});
                                  
                                  try {
                                    const events = await ICalService.getInstance().fetchCalendar(source);
                                    dispatch({ type: 'SYNC_EVENTS', payload: { events, sourceId: source.id } });
                                    
                                    // Update last sync time
                                    const updatedSource = { ...source, lastSync: new Date().toISOString() };
                                    setIcalSources(prev => prev.map(s => s.id === source.id ? updatedSource : s));
                                    dispatch({ type: 'UPDATE_CALENDAR_SOURCE', payload: updatedSource });
                                  } catch (error) {
                                    setIcalErrors({ [source.id]: error.message });
                                  } finally {
                                    setIcalSyncingSource(null);
                                  }
                                }}
                                disabled={icalSyncingSource === source.id}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                title="Synchronisieren"
                              >
                                {icalSyncingSource === source.id ? (
                                  <Loader className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Download className="w-4 h-4" />
                                )}
                              </button>
                              
                              <Toggle 
                                enabled={source.enabled} 
                                onChange={(enabled) => {
                                  const updatedSource = { ...source, enabled };
                                  setIcalSources(prev => prev.map(s => s.id === source.id ? updatedSource : s));
                                  dispatch({ type: 'UPDATE_CALENDAR_SOURCE', payload: updatedSource });
                                }} 
                              />
                              
                              <button
                                onClick={() => {
                                  setIcalSources(prev => prev.filter(s => s.id !== source.id));
                                  dispatch({ type: 'DELETE_CALENDAR_SOURCE', payload: source.id });
                                }}
                                className="p-2 text-red-400 hover:text-red-600 transition-colors"
                                title="Entfernen"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          {icalErrors[source.id] && (
                            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                              <p className="text-sm text-red-600 dark:text-red-400">
                                ❌ {icalErrors[source.id]}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sync All Button */}
                {icalSources.length > 0 && (
                  <div className="flex justify-center">
                    <button
                      onClick={async () => {
                        for (const source of icalSources.filter(s => s.enabled)) {
                          setIcalSyncingSource(source.id);
                          try {
                            const events = await ICalService.getInstance().fetchCalendar(source);
                            dispatch({ type: 'SYNC_EVENTS', payload: { events, sourceId: source.id } });
                            
                            const updatedSource = { ...source, lastSync: new Date().toISOString() };
                            setIcalSources(prev => prev.map(s => s.id === source.id ? updatedSource : s));
                            dispatch({ type: 'UPDATE_CALENDAR_SOURCE', payload: updatedSource });
                          } catch (error) {
                            setIcalErrors(prev => ({ ...prev, [source.id]: error.message }));
                          }
                        }
                        setIcalSyncingSource(null);
                      }}
                      disabled={icalSyncingSource !== null}
                      className="px-6 py-2 text-white rounded-lg transition-colors disabled:opacity-50"
                      style={{ backgroundColor: state.preferences.accentColor }}
                    >
                      {icalSyncingSource ? (
                        <span className="flex items-center space-x-2">
                          <Loader className="w-4 h-4 animate-spin" />
                          <span>Synchronisiere alle...</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-2">
                          <Download className="w-4 h-4" />
                          <span>Alle synchronisieren</span>
                        </span>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        );

      case 'microsoft-todo':
        return <MicrosoftToDoSettingsSection onShowSaved={() => { setShowSaved(true); setTimeout(() => setShowSaved(false), 2000); }} />;

      case 'sync':
        return (
          <div className="space-y-6">
            <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {t('settings.sections.sync.title')}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">Sync & Onlinebackups</p>
            </div>

            {/* Sync Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                {[
                  { id: 'sync-nextcloud', title: 'Nextcloud' },
                  { id: 'sync-caldav', title: 'CalDAV' },
                  { id: 'sync-ical', title: 'iCal Import' },
                  { id: 'sync-todoist', title: 'Todoist' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveIntegrationTab(tab.id)}
                    className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeIntegrationTab === tab.id
                        ? 'text-gray-900 dark:text-white border-current'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                    style={activeIntegrationTab === tab.id ? { color: state.preferences.accentColor, borderColor: state.preferences.accentColor } : {}}
                  >
                    {tab.title}
                  </button>
                ))}
              </nav>
            </div>

            {/* Sync Tab Content */}
            <div className="mt-6 space-y-6">
              {(activeIntegrationTab === 'sync-nextcloud' || !['sync-caldav','sync-ical','sync-todoist'].includes(String(activeIntegrationTab))) && (
                <NextcloudSection />
              )}
              {activeIntegrationTab === 'sync-caldav' && (
                renderCalDAVSection()
              )}
              {activeIntegrationTab === 'sync-ical' && (
                renderICalSection()
              )}
              {activeIntegrationTab === 'sync-todoist' && (
                renderTodoistSection()
              )}
            </div>
          </div>
        );

      case 'data':
        return (
          <div className="space-y-8">
            <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {t('settings.sections.data.title')}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {t('settings.sections.data.description')}
              </p>
            </div>
            {/* Data Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                {[
                  { id: 'data-export', title: 'Export-Optionen' },
                  { id: 'data-import', title: 'Import-Optionen' },
                  { id: 'data-images', title: 'Bildspeicher' },
                  { id: 'data-danger', title: 'Gefahrenzone' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveDataTab(tab.id)}
                    className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeDataTab === tab.id
                        ? 'text-gray-900 dark:text-white border-current'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                    style={activeDataTab === tab.id ? { color: state.preferences.accentColor, borderColor: state.preferences.accentColor } : {}}
                  >
                    {tab.title}
                  </button>
                ))}
              </nav>
            </div>

            {/* Export Tab */}
            {activeDataTab === 'data-export' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Export-Optionen</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col">
                  <div className="flex items-center mb-3">
                    <Download className="w-5 h-5 mr-2" style={{ color: 'var(--accent-color)' }} />
                    <h4 className="font-medium text-gray-900 dark:text-white">JSON (Vollständig)</h4>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 flex-1">
                    Alle Daten, Einstellungen und Boards
                  </p>
                  <button
                    onClick={() => {
                      // Vollständiger Export aller App-Daten
                      const dataToExport = {
                        // Aufgaben und Archiv
                        tasks: state.tasks,
                        archivedTasks: state.archivedTasks,
                        
                        // Strukturen
                        columns: state.columns,
                        tags: state.tags,
                        kanbanBoards: state.kanbanBoards,
                        
                        // 🎯 PIN SYSTEM - NEU!
                        pinColumns: state.pinColumns,
                        
                        // Notizen (inkl. Daily Notes & Emails)
                        notes: state.notes.notes,
                        noteLinks: state.noteLinks,
                        notesViewState: {
                          selectedNote: state.notes.selectedNote,
                          isEditing: state.notes.isEditing,
                          searchQuery: state.notes.searchQuery,
                          selectedTags: state.notes.selectedTags,
                          view: state.notes.view,
                          sortBy: state.notes.sortBy,
                          sortOrder: state.notes.sortOrder,
                          showArchived: state.notes.showArchived,
                          showLinkPreviews: state.notes.showLinkPreviews,
                          editorMode: state.notes.editorMode,
                          dailyNotesMode: state.notes.dailyNotesMode,
                          emailMode: state.notes.emailMode, // 📧 E-MAIL MODUS - NEU!
                          selectedDailyNoteDate: state.notes.selectedDailyNoteDate,
                        },
                        
                        // Einstellungen und Ansichten
                        preferences: state.preferences,
                        viewState: state.viewState,
                        // 📋 Projekt-Kanban-Spalten explizit exportieren für Rückwärtskompatibilität
                        projectKanbanColumns: state.viewState.projectKanban.columns,
                        projectKanbanState: state.viewState.projectKanban,
                        
                        // Kalender-Daten (iCal-Einstellungen)
                        events: state.events,
                        calendarSources: state.calendarSources,
                        
                        // Bilder-Speicher
                        imageStorage: state.imageStorage,
                        
                        // Zusätzliche Daten
                        searchQuery: state.searchQuery,
                        activeTagFilters: state.activeTagFilters,
                        activePriorityFilters: state.activePriorityFilters,
                        focusMode: state.focusMode,
                        focusedColumnId: state.focusedColumnId,
                        showCompletedTasks: state.showCompletedTasks,
                        projectColumnOffset: state.projectColumnOffset,
                        notifications: state.notifications,
                        
                        // Timer-Status
                        activeTimer: state.activeTimer,
                        
                        // Datum und Ansichtsstatus
                        currentDate: state.currentDate.toISOString(),
                        isNoteEditorFullScreen: state.isNoteEditorFullScreen,
                        
                        // Wiederholungsregeln
                        recurrence: state.recurrence,
                        
                        // 🕒 Zeitbudget-Features
                        personalCapacity: state.personalCapacity,
                        
                        // Metadaten
                        exportDate: new Date().toISOString(),
                        version: '2.3', // ✨ Vollständiger Export mit Zeitbudget-Features
                        metadata: {
                          totalTasks: state.tasks.length,
                          totalArchivedTasks: state.archivedTasks.length,
                          totalNotes: state.notes.notes.length,
                          totalDailyNotes: state.notes.notes.filter(note => note.dailyNote).length,
                          totalEmailNotes: state.notes.notes.filter(note => note.metadata?.emailMetadata).length, // 📧 E-MAIL STATISTIK
                          totalTags: state.tags.length,
                          totalBoards: state.kanbanBoards.length,
                          totalColumns: state.columns.length,
                          totalPinColumns: state.pinColumns.length, // 🎯 PIN STATISTIK
                          totalNoteLinks: state.noteLinks.length,
                          totalImages: state.imageStorage.images.length,
                          totalNotifications: state.notifications.length,
                          totalEvents: state.events.length,
                          totalCalendarSources: state.calendarSources.length,
                          hasActiveTimer: !!state.activeTimer,
                          // 🕒 Zeitbudget-Metadaten
                          hasPersonalCapacity: !!state.personalCapacity,
                          projectsWithTimebudgets: state.columns.filter(col => col.type === 'project' && col.timebudget).length,
                          appVersion: '2.3', // ✨ App-Version mit Zeitbudget-Features
                          dataSize: 0, // Wird unten berechnet
                          exportTime: Date.now()
                        }
                      };
                      
                      // Datengröße berechnen
                      const jsonString = JSON.stringify(dataToExport, null, 2);
                      dataToExport.metadata.dataSize = jsonString.length;
                      
                      // Finaler Export-String
                      const finalContent = JSON.stringify(dataToExport, null, 2);
                      const blob = new Blob([finalContent], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `taskfuchs-vollstaendig-${new Date().toISOString().split('T')[0]}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                      setShowSaved(true);
                      setTimeout(() => setShowSaved(false), 2000);
                    }}
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--accent-color) 10%, transparent)',
                      borderColor: 'color-mix(in srgb, var(--accent-color) 30%, transparent)',
                      color: 'var(--accent-color)'
                    }}
                    className="w-full px-3 py-2 rounded-lg transition-all duration-300 text-sm flex items-center justify-center space-x-2 font-medium border hover:scale-105 hover:shadow-md"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export</span>
                  </button>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col">
                  <div className="flex items-center mb-3">
                    <FileText className="w-5 h-5 mr-2" style={{ color: 'var(--accent-color)' }} />
                    <h4 className="font-medium text-gray-900 dark:text-white">CSV Tabelle</h4>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 flex-1">
                    Für Excel/Google Sheets
                  </p>
                  <button
                    onClick={() => {
                      const csvContent = [
                        'Titel,Beschreibung,Status,Priorität,Datum,Tags,Projekt,Kanban-Spalte,Position',
                        ...state.tasks.map(task => {
                          const project = state.columns.find(col => col.id === task.columnId);
                          const kanbanColumn = state.viewState.projectKanban.columns.find(col => col.id === task.kanbanColumnId);
                          return `"${task.title}","${task.description || ''}","${task.completed ? 'Erledigt' : 'Offen'}","${task.priority}","${task.reminderDate || ''}","${task.tags.join(';')}","${project?.title || ''}","${kanbanColumn?.title || ''}","${task.position}"`;
                        })
                      ].join('\n');
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `taskfuchs-aufgaben-${new Date().toISOString().split('T')[0]}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                      setShowSaved(true);
                      setTimeout(() => setShowSaved(false), 2000);
                    }}
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--accent-color) 10%, transparent)',
                      borderColor: 'color-mix(in srgb, var(--accent-color) 30%, transparent)',
                      color: 'var(--accent-color)'
                    }}
                    className="w-full px-3 py-2 rounded-lg transition-all duration-300 text-sm flex items-center justify-center space-x-2 font-medium border hover:scale-105 hover:shadow-md"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export</span>
                  </button>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col">
                  <div className="flex items-center mb-3">
                    <FileText className="w-5 h-5 mr-2" style={{ color: 'var(--accent-color)' }} />
                    <h4 className="font-medium text-gray-900 dark:text-white">Text Report</h4>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 flex-1">
                    Druckbare Aufgabenliste
                  </p>
                  <button
                    onClick={() => {
                      const textContent = [
                        `TaskFuchs Export - ${new Date().toLocaleDateString('de-DE')}`,
                        '='.repeat(50),
                        '',
                        'AUFGABEN:',
                        ...state.tasks.map(task => 
                          `- [${task.completed ? 'x' : ' '}] ${task.title}${task.description ? ` - ${task.description}` : ''}`
                        ),
                        '',
                        `Insgesamt: ${state.tasks.length} Aufgaben`
                      ].join('\n');
                      const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `taskfuchs-export-${new Date().toISOString().split('T')[0]}.txt`;
                      a.click();
                      URL.revokeObjectURL(url);
                      setShowSaved(true);
                      setTimeout(() => setShowSaved(false), 2000);
                    }}
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--accent-color) 10%, transparent)',
                      borderColor: 'color-mix(in srgb, var(--accent-color) 30%, transparent)',
                      color: 'var(--accent-color)'
                    }}
                    className="w-full px-3 py-2 rounded-lg transition-all duration-300 text-sm flex items-center justify-center space-x-2 font-medium border hover:scale-105 hover:shadow-md"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export</span>
                  </button>
                </div>

                {/* Removed: todo.txt Format export */}

                {/* Removed: Smart-Format TXT export */}
              </div>
            </div>
            )}

            {/* Image Storage Tab */}
            {activeDataTab === 'data-images' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Bildspeicher</h3>
              <div className="space-y-6">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">Screenshots & Bilder verwalten</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Verwalte alle über Copy & Paste eingefügten Bilder in deinen Notizen
                      </div>
                    </div>
                    <button
                      onClick={() => setShowImageStorageManager(true)}
                      className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-all flex items-center space-x-2"
                      style={getAccentColorStyles().bg}
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span>Bilder verwalten</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-white dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Gespeicherte Bilder</div>
                      <div className="text-xl font-semibold text-gray-900 dark:text-white">{state.imageStorage.images.length}</div>
                    </div>
                    <div className="bg-white dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Verwendeter Speicher</div>
                      <div className="text-xl font-semibold text-gray-900 dark:text-white">{Math.round((state.imageStorage.totalSize / state.imageStorage.maxSize) * 100)}%</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    💡 <strong>Tipp:</strong> Füge Screenshots direkt in deine Notizen ein mit Cmd+V (Mac) oder Ctrl+V (Windows/Linux)
                  </div>
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                    <button
                      onClick={() => setShowImageStorageDebugger(true)}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span>Debug Image Storage</span>
                    </button>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="font-medium text-gray-900 dark:text-white mb-3">Automatische Bereinigung</div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-sm text-gray-900 dark:text-white">Ungenutzte Bilder automatisch löschen</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Bilder werden nach {state.imageStorage.cleanupAfterDays} Tagen gelöscht, wenn sie nicht mehr verwendet werden</div>
                    </div>
                    <Toggle
                      enabled={state.imageStorage.autoCleanup}
                      onChange={() => dispatch({ type: 'SET_IMAGE_STORAGE', payload: { ...state.imageStorage, autoCleanup: !state.imageStorage.autoCleanup } })}
                    />
                  </div>
                  {state.imageStorage.autoCleanup && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-900 dark:text-white">Bereinigung nach (Tage)</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{state.imageStorage.cleanupAfterDays}</div>
                      </div>
                      <input type="range" min="1" max="90" step="1" value={state.imageStorage.cleanupAfterDays} onChange={(e) => dispatch({ type: 'SET_IMAGE_STORAGE', payload: { ...state.imageStorage, cleanupAfterDays: parseInt(e.target.value) } })} className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer slider" />
                    </div>
                  )}
                  <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">Speichergröße</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Maximale Größe des Bildspeichers</div>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{(state.imageStorage.maxSize / (1024 * 1024)).toFixed(0)} MB</div>
                    </div>
                    <input type="range" min="10" max="500" step="10" value={state.imageStorage.maxSize / (1024 * 1024)} onChange={(e) => dispatch({ type: 'SET_IMAGE_STORAGE', payload: { ...state.imageStorage, maxSize: parseInt(e.target.value) * 1024 * 1024 } })} className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer slider" />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2"><span>10 MB</span><span>500 MB</span></div>
                  </div>
                  <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">Komprimierungsqualität</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Qualität der Bildkomprimierung (höher = bessere Qualität, größere Dateien)</div>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{Math.round(state.imageStorage.compressionQuality * 100)}%</div>
                    </div>
                    <input type="range" min="0.1" max="1" step="0.1" value={state.imageStorage.compressionQuality} onChange={(e) => dispatch({ type: 'SET_IMAGE_STORAGE', payload: { ...state.imageStorage, compressionQuality: parseFloat(e.target.value) } })} className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer slider" />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2"><span>10%</span><span>100%</span></div>
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* Import Tab */}
            {activeDataTab === 'data-import' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Import-Optionen</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { name: 'TaskFuchs', accept: '.json,.tfx', icon: Package },
                  { name: 'CSV Dateien', accept: '.csv', icon: FileText },
                  { name: 'Todoist', accept: '.csv', icon: Package },
                  { name: 'MS To Do', accept: '.csv', icon: Package }
                ].map((importType) => (
                  <div key={importType.name} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center mb-3">
                      <importType.icon className="w-5 h-5 mr-2" style={{ color: 'var(--accent-color)' }} />
                      <h4 className="font-medium text-gray-900 dark:text-white">{importType.name}</h4>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {importType.accept} Dateien
                    </p>
                    <label 
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--accent-color) 10%, transparent)',
                        borderColor: 'color-mix(in srgb, var(--accent-color) 30%, transparent)',
                        color: 'var(--accent-color)'
                      }}
                      className="w-full px-3 py-2 rounded-lg transition-all duration-300 cursor-pointer flex items-center justify-center space-x-2 text-sm font-medium border hover:scale-105 hover:shadow-md">
                      <Upload className="w-4 h-4" />
                      <span>Import</span>
                      <input
                        type="file"
                        accept={importType.accept}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              try {
                                const content = event.target?.result as string;
                                
                                // Handle different file types (Smart-Format TXT entfernt)
                                
                                // Handle JSON imports (existing logic)
                                const data = JSON.parse(content);
                                
                                // Validierung der importierten Daten
                                const validation = ImportExport.validateImportData(data);
                                
                                // Warnung mit Validierungsergebnissen
                                let warningMessage = '⚠️ WARNUNG: Import überschreibt alle bestehenden Daten!\n\n';
                                warningMessage += `📊 Importierte Daten (Version ${validation.version}):\n`;
                                warningMessage += `• Aufgaben: ${validation.summary.tasks}\n`;
                                warningMessage += `• Archivierte Aufgaben: ${validation.summary.archivedTasks}\n`;
                                warningMessage += `• Notizen: ${validation.summary.notes}\n`;
                                warningMessage += `• Daily Notes: ${validation.summary.dailyNotes}\n`;
                                warningMessage += `• Tags: ${validation.summary.tags}\n`;
                                warningMessage += `• Boards: ${validation.summary.boards}\n`;
                                warningMessage += `• Spalten: ${validation.summary.columns}\n`;
                                warningMessage += `• Notiz-Verknüpfungen: ${validation.summary.noteLinks}\n`;
                                warningMessage += `• Bilder: ${validation.summary.images}\n`;
                                warningMessage += `• Benachrichtigungen: ${validation.summary.notifications}\n`;
                                
                                if (validation.warnings.length > 0) {
                                  warningMessage += '\n⚠️ Warnungen:\n';
                                  validation.warnings.forEach(warning => {
                                    warningMessage += `• ${warning}\n`;
                                  });
                                }
                                
                                warningMessage += '\nMöchten Sie fortfahren?';
                                
                                if (confirm(warningMessage)) {
                                  if (data.tasks) {
                                    // VOLLSTÄNDIGER IMPORT ALLER VERFÜGBAREN DATEN (ALLE FEATURES)
                                    dispatch({ 
                                      type: 'IMPORT_DATA_REPLACE', 
                                      payload: {
                                        // Kern-Daten
                                        tasks: data.tasks || data.data?.tasks || [],
                                        archivedTasks: data.archivedTasks || data.data?.archivedTasks || [],
                                        boards: data.boards || data.kanbanBoards || data.data?.kanbanBoards || [],
                                        columns: data.columns || data.data?.columns || [],
                                        tags: data.tags || data.data?.tags || [],
                                        notes: Array.isArray(data.notes) 
                                          ? data.notes 
                                          : (data.notes && Array.isArray(data.notes.notes) 
                                              ? data.notes.notes 
                                              : (data.data?.notes || [])),
                                        noteLinks: data.noteLinks || data.data?.noteLinks || [],
                                        preferences: data.preferences || data.data?.preferences || {},
                                        viewState: data.viewState || data.data?.viewState || {},
                                        projectKanbanColumns: data.projectKanbanColumns || data.viewState?.projectKanban?.columns || data.data?.projectKanbanColumns || [],
                                        projectKanbanState: data.projectKanbanState || data.viewState?.projectKanban || data.data?.projectKanbanState || {},
                                        
                                        // 🎯 PIN SYSTEM - NEU!
                                        pinColumns: data.pinColumns || data.data?.pinColumns || [],
                                        
                                        // 📧 NOTES VIEW STATE mit E-Mail Modus
                                        notesViewState: data.notesViewState || data.data?.notesViewState || {},
                                        
                                        // 📅 KALENDER-DATEN
                                        events: data.events || data.data?.events || [],
                                        calendarSources: data.calendarSources || data.data?.calendarSources || [],
                                        
                                        // 🔍 FILTER UND ANSICHTEN
                                        searchQuery: data.searchQuery || data.data?.searchQuery || '',
                                        activeTagFilters: data.activeTagFilters || data.data?.activeTagFilters || [],
                                        activePriorityFilters: data.activePriorityFilters || data.data?.activePriorityFilters || [],
                                        focusMode: data.focusMode !== undefined ? data.focusMode : (data.data?.focusMode !== undefined ? data.data.focusMode : undefined),
                                        focusedColumnId: data.focusedColumnId !== undefined ? data.focusedColumnId : data.data?.focusedColumnId,
                                        showCompletedTasks: data.showCompletedTasks !== undefined ? data.showCompletedTasks : data.data?.showCompletedTasks,
                                        projectColumnOffset: data.projectColumnOffset !== undefined ? data.projectColumnOffset : data.data?.projectColumnOffset,
                                        
                                        // 🔔 BENACHRICHTIGUNGEN
                                        notifications: data.notifications || data.data?.notifications || [],
                                        
                                        // 📝 EDITOR STATUS
                                        isNoteEditorFullScreen: data.isNoteEditorFullScreen !== undefined ? data.isNoteEditorFullScreen : data.data?.isNoteEditorFullScreen,
                                        
                                        // 🔄 WIEDERHOLUNGSREGELN
                                        recurrence: data.recurrence || data.data?.recurrence || {},
                                        
                                        // 🖼️ BILDSPEICHER
                                        imageStorage: data.imageStorage || data.data?.imageStorage || { images: [], currentSize: 0 }
                                      }
                                    });
                                    
                                    // Zusätzliche Daten setzen, falls verfügbar
                                    if (data.imageStorage) {
                                      dispatch({ type: 'SET_IMAGE_STORAGE', payload: data.imageStorage });
                                    }
                                    
                                    if (data.notifications) {
                                      data.notifications.forEach((notification: any) => {
                                        dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
                                      });
                                    }
                                    
                                    let successMessage = `✅ Import erfolgreich abgeschlossen!\n\n`;
                                    successMessage += `📊 Importierte Daten:\n`;
                                    successMessage += `• ${validation.summary.tasks} Aufgaben\n`;
                                    successMessage += `• ${validation.summary.archivedTasks} archivierte Aufgaben\n`;
                                    successMessage += `• ${validation.summary.notes} Notizen (davon ${validation.summary.dailyNotes} Daily Notes)\n`;
                                    successMessage += `• ${validation.summary.tags} Tags\n`;
                                    successMessage += `• ${validation.summary.boards} Boards\n`;
                                    successMessage += `• ${validation.summary.columns} Spalten\n`;
                                    successMessage += `• ${validation.summary.noteLinks} Notiz-Verknüpfungen\n`;
                                    successMessage += `• ${validation.summary.images} Bilder\n`;
                                    successMessage += `• ${validation.summary.notifications} Benachrichtigungen`;
                                    
                                    alert(successMessage);
                                    setShowSaved(true);
                                    setTimeout(() => setShowSaved(false), 2000);
                                  }
                                }
                              } catch (error) {
                                alert('❌ Fehler beim Importieren: ' + (error instanceof Error ? error.message : 'Unbekannter Fehler') + '\n\nBitte überprüfen Sie, ob die Datei ein gültiges TaskFuchs-Format hat.');
                              }
                            };
                            reader.readAsText(file);
                          }
                          e.target.value = '';
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>
            )}

            {/* Danger Zone Tab */}
            {activeDataTab === 'data-danger' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Gefahrenzone</h3>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-red-800 dark:text-red-400">
                      Alle Daten unwiderruflich löschen
                    </h4>
                    <p className="text-sm text-red-600 dark:text-red-500">
                      Alle Aufgaben, Boards, Tags und Einstellungen permanent entfernen
                    </p>
                  </div>
                  <button
                    onClick={() => setShowClearDataModal(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Alles löschen</span>
                  </button>
                </div>
              </div>
            </div>
            )}
          </div>
        );

      case 'informationen':
        return (
          <div className="space-y-6">
            <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Informationen
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Datenschutz & Performance
              </p>
            </div>
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                {[
                  { id: 'privacy', title: 'Datenschutz' },
                  { id: 'performance', title: 'Performance' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveInfoTab(tab.id as 'privacy' | 'performance')}
                    className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeInfoTab === tab.id
                        ? 'text-gray-900 dark:text-white border-current'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                    style={activeInfoTab === tab.id ? { color: state.preferences.accentColor, borderColor: state.preferences.accentColor } : {}}
                  >
                    {tab.title}
                  </button>
                ))}
              </nav>
            </div>

            {activeInfoTab === 'privacy' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Datenschutz & Sicherheit</h3>
                  <div className="space-y-6">
                    <div 
                      className="p-4 rounded-lg border"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--accent-color) 8%, transparent)',
                        borderColor: 'color-mix(in srgb, var(--accent-color) 25%, transparent)'
                      }}
                    >
                      <h4 className="font-medium mb-2" style={{ color: 'var(--accent-color)' }}>🔒 Ihre Daten bleiben lokal</h4>
                      <ul className="text-sm space-y-1" style={{ color: 'color-mix(in srgb, var(--accent-color) 80%, #4b5563)' }}>
                        <li>• Alle Daten werden nur in Ihrem Browser gespeichert (localStorage)</li>
                        <li>• Keine Datenübertragung an externe Server (außer gewählte Sync-Optionen)</li>
                        <li>• Vollständige Kontrolle über Ihre Aufgaben und Notizen</li>
                        <li>• Open Source - transparenter Code</li>
                      </ul>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3">Lokaler Speicher</h4>
                      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                        <div>Aufgaben: {state.tasks.length} Einträge</div>
                        <div>Boards: {state.kanbanBoards.length} Einträge</div>
                        <div>Tags: {state.tags.length} Einträge</div>
                        <div>Notizen: {state.notes.notes.length} Einträge</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeInfoTab === 'performance' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Performance & Debug</h3>
                  <div className="space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <h4 className="font-medium text-blue-800 dark:text-blue-400 mb-2">Performance Monitoring</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                        Überwache die App-Performance, Memory-Nutzung und Render-Zeiten.
                      </p>
                      <button
                        onClick={() => setShowPerformanceDashboard(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Performance Dashboard öffnen
                      </button>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3">Performance-Optimierungen</h4>
                      <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                        <li>• Virtualisierte Listen für große Datenmengen</li>
                        <li>• Debounced Inputs für bessere Responsivität</li>
                        <li>• React.memo für teure Komponenten</li>
                        <li>• Optimierte Re-Renders durch useCallback</li>
                        <li>• Lazy Loading für bessere Startzeiten</li>
                      </ul>
                    </div>

                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <h4 className="font-medium text-green-800 dark:text-green-400 mb-2">✨ Aktive Optimierungen</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-green-700 dark:text-green-300 font-medium">UI Performance</div>
                          <div className="text-green-600 dark:text-green-400">60 FPS Target</div>
                        </div>
                        <div>
                          <div className="text-green-700 dark:text-green-300 font-medium">Memory</div>
                          <div className="text-green-600 dark:text-green-400">Auto-Cleanup</div>
                        </div>
                        <div>
                          <div className="text-green-700 dark:text-green-300 font-medium">Smart Input</div>
                          <div className="text-green-600 dark:text-green-400">Natürliche Sprache</div>
                        </div>
                        <div>
                          <div className="text-green-700 dark:text-green-300 font-medium">Virtualisierung</div>
                          <div className="text-green-600 dark:text-green-400">Bei &gt;100 Items</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Datenschutz & Sicherheit</h3>
              <div className="space-y-6">
                <div 
                  className="p-4 rounded-lg border"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--accent-color) 8%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--accent-color) 25%, transparent)'
                  }}
                >
                  <h4 className="font-medium mb-2" style={{ color: 'var(--accent-color)' }}>🔒 Ihre Daten bleiben lokal</h4>
                  <ul className="text-sm space-y-1" style={{ color: 'color-mix(in srgb, var(--accent-color) 80%, #4b5563)' }}>
                    <li>• Alle Daten werden nur in Ihrem Browser gespeichert (localStorage)</li>
                    <li>• Keine Datenübertragung an externe Server (außer gewählte Sync-Optionen)</li>
                    <li>• Vollständige Kontrolle über Ihre Aufgaben und Notizen</li>
                    <li>• Open Source - transparenter Code</li>
                  </ul>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Lokaler Speicher</h4>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <div>Aufgaben: {state.tasks.length} Einträge</div>
                    <div>Boards: {state.kanbanBoards.length} Einträge</div>
                    <div>Tags: {state.tags.length} Einträge</div>
                    <div>Notizen: {state.notes.notes.length} Einträge</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'performance':
        return (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Performance & Debug</h3>
              <div className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 dark:text-blue-400 mb-2">Performance Monitoring</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                    Überwache die App-Performance, Memory-Nutzung und Render-Zeiten.
                  </p>
                  <button
                    onClick={() => setShowPerformanceDashboard(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Performance Dashboard öffnen
                  </button>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Performance-Optimierungen</h4>
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <li>• Virtualisierte Listen für große Datenmengen</li>
                    <li>• Debounced Inputs für bessere Responsivität</li>
                    <li>• React.memo für teure Komponenten</li>
                    <li>• Optimierte Re-Renders durch useCallback</li>
                    <li>• Lazy Loading für bessere Startzeiten</li>
                  </ul>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 dark:text-green-400 mb-2">✨ Aktive Optimierungen</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-green-700 dark:text-green-300 font-medium">UI Performance</div>
                      <div className="text-green-600 dark:text-green-400">60 FPS Target</div>
                    </div>
                    <div>
                      <div className="text-green-700 dark:text-green-300 font-medium">Memory</div>
                      <div className="text-green-600 dark:text-green-400">Auto-Cleanup</div>
                    </div>
                    <div>
                      <div className="text-green-700 dark:text-green-300 font-medium">Smart Input</div>
                      <div className="text-green-600 dark:text-green-400">Natürliche Sprache</div>
                    </div>
                                         <div>
                       <div className="text-green-700 dark:text-green-300 font-medium">Virtualisierung</div>
                       <div className="text-green-600 dark:text-green-400">Bei &gt;100 Items</div>
                     </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-gray-400 dark:text-gray-500 text-lg">
                Dieser Bereich wird noch entwickelt
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Bald verfügbar
              </div>
            </div>
          </div>
        );
    }
  };

  // Modal handlers for improved UI
  const handleOpenImageUrlModal = () => {
    setTempImageUrl('');
    setShowImageUrlModal(true);
  };

  const handleSaveImageUrl = () => {
    if (tempImageUrl.trim()) {
      const newImageUrl = tempImageUrl.trim();
      
      // Add to gallery (keep only last 10 images)
      const updatedGallery = [newImageUrl, ...backgroundImageGallery.filter(url => url !== newImageUrl)].slice(0, 10);
      setBackgroundImageGallery(updatedGallery);
      localStorage.setItem('backgroundImageGallery', JSON.stringify(updatedGallery));
      
      // Set as current background
      handleBackgroundImageChange(newImageUrl);
      setShowImageUrlModal(false);
      setTempImageUrl('');
    }
  };

  const handleSelectImageFromGallery = (url: string) => {
    handleBackgroundImageChange(url);
    
    // Move selected image to front of gallery
    const updatedGallery = [url, ...backgroundImageGallery.filter(imageUrl => imageUrl !== url)];
    setBackgroundImageGallery(updatedGallery);
    localStorage.setItem('backgroundImageGallery', JSON.stringify(updatedGallery));
  };

  const handleRemoveImageFromGallery = (url: string) => {
    setImageToDelete(url);
    setShowDeleteImageModal(true);
  };

  const confirmDeleteImage = () => {
    if (imageToDelete) {
      const updatedGallery = backgroundImageGallery.filter(imageUrl => imageUrl !== imageToDelete);
    setBackgroundImageGallery(updatedGallery);
    localStorage.setItem('backgroundImageGallery', JSON.stringify(updatedGallery));
    
    // If this was the current background, clear it
      if (state.preferences.backgroundImage === imageToDelete) {
      handleBackgroundImageChange('');
    }
    }
    setShowDeleteImageModal(false);
    setImageToDelete('');
  };

  // Stock Photos image selection handler  
  const handleSelectStockPhoto = (photo: any) => {
    // Get optimal quality based on screen size and pixel density
    const imageUrl = stockPhotosService.getOptimalBackgroundUrl ? 
      stockPhotosService.getOptimalBackgroundUrl(photo) : 
      photo.src.original; // Fallback to highest quality
    
    // Add to gallery (keep only last 10 images)
    const updatedGallery = [imageUrl, ...backgroundImageGallery.filter(url => url !== imageUrl)].slice(0, 10);
    setBackgroundImageGallery(updatedGallery);
    localStorage.setItem('backgroundImageGallery', JSON.stringify(updatedGallery));
    
    // Set as current background
    handleBackgroundImageChange(imageUrl);
    
    // Show success notification
    console.log(`Hintergrundbild von ${photo.photographer} (Picsum Photos) wurde hinzugefügt`);
  };

  const handleOpenColorPickerModal = (type: 'background' | 'gradientFrom' | 'gradientTo') => {
    setColorPickerType(type);
    const currentValue = type === 'background' ? backgroundColorTemp 
                      : type === 'gradientFrom' ? gradientFromTemp 
                      : gradientToTemp;
    setTempColorValue(currentValue);
    setShowColorPickerModal(true);
  };

  const handleColorValueChange = (value: string) => {
    setTempColorValue(value);
    // Apply immediately based on type
    if (colorPickerType === 'background') {
      handleTempBackgroundColorChange(value);
    } else if (colorPickerType === 'gradientFrom') {
      handleTempGradientFromChange(value);
    } else {
      handleTempGradientToChange(value);
    }
  };

  return (
    <>
      <div className="h-full flex bg-gray-50 dark:bg-gray-900">
        {/* Settings Sidebar */}
        <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                <SettingsIcon className="w-8 h-8" style={{ color: 'var(--accent-color)' }} />
                <span>Einstellungen</span>
              </h1>
              {showSaved && (
                <div className="flex items-center space-x-2 px-3 py-1.5 text-white rounded-lg animate-pulse text-sm"
                     style={getAccentColorStyles().bg}>
                  <Check className="w-3 h-3" />
                  <span>Gespeichert!</span>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="flex items-center justify-end">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Konfiguriere deine TaskFuchs-Erfahrung
              </span>
            </div>
          </div>

          {/* Settings List */}
          <div className="flex-1 overflow-y-auto">
            {getFilteredSections().map((section) => (
              <div
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-700/60 ${
                  activeSection === section.id 
                    ? 'border-l-4' 
                    : ''
                }`}
                style={activeSection === section.id ? { 
                  borderLeftColor: getAccentColorStyles().border.borderColor,
                  backgroundColor: getAccentColorStyles().bgLight.backgroundColor
                } : {}}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className={`font-medium text-sm truncate flex-1 ${
                    activeSection === section.id 
                      ? '' 
                      : 'text-gray-900 dark:text-white'
                  }`}
                  style={activeSection === section.id ? getAccentColorStyles().text : {}}>
                    {section.title}
                  </h3>
                  <section.icon className={`w-4 h-4 ml-2 flex-shrink-0 ${
                    activeSection === section.id ? '' : 'text-gray-400'
                  }`}
                  style={activeSection === section.id ? getAccentColorStyles().text : {}} />
                </div>
                
                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                  {section.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex">
          <div className="flex-1 bg-white dark:bg-gray-800 p-6 overflow-y-auto">
            <div className="max-w-2xl">
              {renderSection()}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showClearDataModal && (
        <DeleteConfirmationModal
          isOpen={showClearDataModal}
          onClose={() => setShowClearDataModal(false)}
          onConfirm={() => {
            // Complete factory reset
            dispatch({ type: 'CLEAR_ALL_DATA' });
            setShowClearDataModal(false);
            
            // Show success message briefly, then reload
            setShowSaved(true);
            setTimeout(() => {
              // Reload page to ensure complete reset
              window.location.reload();
            }, 1500);
          }}
          title="Alle Daten unwiderruflich löschen"
          message="⚠️ WARNUNG: Diese Aktion setzt TaskFuchs komplett auf den Werkzustand zurück!\n\nGelöscht werden:\n• Alle Aufgaben und archivierte Aufgaben\n• Alle Projekte, Spalten und Boards\n• Alle Tags und Notizen\n• Alle Einstellungen und Präferenzen\n• Alle Bilder und Dateien\n• Alle Integrationen (Microsoft To-Do, Toggl, etc.)\n• Alle Timer-Daten\n• Alle Sync-Einstellungen\n\nDiese Aktion kann NICHT rückgängig gemacht werden!"
        />
      )}

      {/* Image Delete Confirmation Modal */}
      {showDeleteImageModal && (
        <DeleteConfirmationModal
          isOpen={showDeleteImageModal}
          onClose={() => {
            setShowDeleteImageModal(false);
            setImageToDelete('');
          }}
          onConfirm={confirmDeleteImage}
          title="Hintergrundbild löschen"
          message="Möchten Sie dieses Hintergrundbild wirklich aus der Galerie entfernen?\n\nWenn es aktuell als Hintergrund verwendet wird, wird es durch den Standard-Hintergrund ersetzt."
          simple={true}
        />
      )}

      {/* Image URL Modal */}
      {showImageUrlModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Hintergrundbild hinzufügen</h3>
              <button
                onClick={() => setShowImageUrlModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bild-URL
                </label>
                <input
                  type="url"
                  value={tempImageUrl}
                  onChange={(e) => setTempImageUrl(e.target.value)}
                  placeholder="https://beispiel.com/bild.jpg"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': getAccentColorStyles().bg.backgroundColor } as any}
                />
              </div>
              
                                <div className="rounded-lg p-3" style={{ 
                    backgroundColor: `${state.preferences.accentColor}15`,
                    borderColor: `${state.preferences.accentColor}40`
                  }}>
                                        <h4 className="text-sm font-medium mb-2" style={{ color: state.preferences.accentColor }}>💡 So finden Sie Bild-URLs:</h4>
                    <ul className="text-xs space-y-1 opacity-75" style={{ color: state.preferences.accentColor }}>
                    <li>• Rechtsklick auf ein Bild → "Bildadresse kopieren"</li>
                    <li>• Unsplash.com: Foto öffnen → "Download" → Link kopieren</li>
                  <li>• Pexels.com: Foto wählen → "Original Size" → Link kopieren</li>
                  <li>• Eigene Bilder: In Cloud-Dienst hochladen und Link teilen</li>
                </ul>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowImageUrlModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSaveImageUrl}
                disabled={!tempImageUrl.trim()}
                className="flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={getAccentColorStyles().bg}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = getAccentColorStyles().bgHover.backgroundColor;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = getAccentColorStyles().bg.backgroundColor;
                  }
                }}
              >
                Hinzufügen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Color Picker Modal */}
      {showColorPickerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {colorPickerType === 'background' ? 'Hintergrundfarbe' 
                : colorPickerType === 'gradientFrom' ? 'Startfarbe' 
                : 'Endfarbe'} wählen
              </h3>
              <button
                onClick={() => setShowColorPickerModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={tempColorValue}
                  onChange={(e) => handleColorValueChange(e.target.value)}
                  className="w-16 h-16 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer"
                />
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Hex-Code
                  </label>
                  <input
                    type="text"
                    value={tempColorValue}
                    onChange={(e) => {
                      if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value) || e.target.value === '') {
                        handleColorValueChange(e.target.value);
                      }
                    }}
                    placeholder="#f3f4f6"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 font-mono"
                    style={{ '--tw-ring-color': getAccentColorStyles().bg.backgroundColor } as any}
                  />
                </div>
              </div>
              
              {/* Color Preview */}
              <div className="h-12 rounded-lg border border-gray-200 dark:border-gray-600" 
                   style={{ backgroundColor: tempColorValue }}>
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-6">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Änderungen werden sofort übernommen
              </div>
              <button
                onClick={() => setShowColorPickerModal(false)}
                className="px-4 py-2 text-white rounded-lg transition-colors"
                style={getAccentColorStyles().bg}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = getAccentColorStyles().bgHover.backgroundColor;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = getAccentColorStyles().bg.backgroundColor;
                }}
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Performance Dashboard */}
      <PerformanceDashboard
        isOpen={showPerformanceDashboard}
        onClose={() => setShowPerformanceDashboard(false)}
      />

      {/* Image Storage Manager */}
      <ImageStorageManager
        isOpen={showImageStorageManager}
        onClose={() => setShowImageStorageManager(false)}
      />

      {/* Image Storage Debugger */}
      {showImageStorageDebugger && (
        <ImageStorageDebugger
          onClose={() => setShowImageStorageDebugger(false)}
        />
      )}

      {/* Stock Photos Modal */}
      <StockPhotosModal
          isOpen={showStockPhotosModal}
          onClose={() => setShowStockPhotosModal(false)}
          onSelectPhoto={handleSelectStockPhoto}
        />

      {/* Photo Credits Modal - render at root with highest z-index */}
      {showPhotoCreditsModal && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowPhotoCreditsModal(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full mx-4 p-5 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Photo credentials</h3>
              <button onClick={() => setShowPhotoCreditsModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white">✕</button>
            </div>
            <div className="prose prose-sm dark:prose-invert max-h-80 overflow-y-auto">
              <p>
                Foto von <a href="https://unsplash.com/de/@rayhennessy?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash" target="_blank" rel="noreferrer">Ray Hennessy</a> auf <a href="https://unsplash.com/de/fotos/brown-fox-on-snow-field-xUUZcpQlqpM?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash" target="_blank" rel="noreferrer">Unsplash</a><br/>
                Foto von <a href="https://unsplash.com/de/@dariojud_?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash" target="_blank" rel="noreferrer">Dario Jud</a> auf <a href="https://unsplash.com/de/fotos/neblige-baume-die-in-einen-nebligen-dunst-gehullt-sind-4EvreRzmq44?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash" target="_blank" rel="noreferrer">Unsplash</a><br/>
                Foto von <a href="https://pixabay.com/de/users/dehaar-8454267/?utm_source=link-attribution&utm_medium=referral&utm_campaign=image&utm_content=3250275" target="_blank" rel="noreferrer">Christoph de Haar</a> auf <a href="https://pixabay.com/de//?utm_source=link-attribution&utm_medium=referral&utm_campaign=image&utm_content=3250275" target="_blank" rel="noreferrer">Pixabay</a><br/>
                Foto von <a href="https://unsplash.com/de/@john_artifexfilm?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash" target="_blank" rel="noreferrer">John Lee</a> auf <a href="https://unsplash.com/de/fotos/landschaft-der-berge-oMneOBYhJxY?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash" target="_blank" rel="noreferrer">Unsplash</a><br/>
                Foto von <a href="https://unsplash.com/de/@neom?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash" target="_blank" rel="noreferrer">NEOM</a> auf <a href="https://unsplash.com/de/fotos/die-sonne-geht-uber-einer-wustenlandschaft-unter-va9218QJFAk?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash" target="_blank" rel="noreferrer">Unsplash</a><br/>
                Foto von <a href="https://unsplash.com/de/@luckybeanz?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash" target="_blank" rel="noreferrer">Mark Harpur</a> auf <a href="https://unsplash.com/de/fotos/brauner-holzsteg-zwischen-lavendelblumenfeld-in-der-nahe-eines-gewassers-wahrend-der-goldenen-stunde-K2s_YE031CA?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash" target="_blank" rel="noreferrer">Unsplash</a><br/>
                Foto von <a href="https://pixabay.com/de/users/onatee-27254887/?utm_source=link-attribution&utm_medium=referral&utm_campaign=image&utm_content=8650151" target="_blank" rel="noreferrer">Abubakr Abdelatif</a> auf <a href="https://pixabay.com/de//?utm_source=link-attribution&utm_medium=referral&utm_campaign=image&utm_content=8650151" target="_blank" rel="noreferrer">Pixabay</a><br/>
                Foto von <a href="https://pixabay.com/de/users/orcatec-2164300/?utm_source=link-attribution&utm_medium=referral&utm_campaign=image&utm_content=4335571" target="_blank" rel="noreferrer">Jonathan Reichel</a> auf <a href="https://pixabay.com/de//?utm_source=link-attribution&utm_medium=referral&utm_campaign=image&utm_content=4335571" target="_blank" rel="noreferrer">Pixabay</a><br/>
                Bild von <a href="https://pixabay.com/de/users/angi128-22878334/?utm_source=link-attribution&utm_medium=referral&utm_campaign=image&utm_content=6553345" target="_blank" rel="noreferrer">Angi128</a> auf <a href="https://pixabay.com/de//?utm_source=link-attribution&utm_medium=referral&utm_campaign=image&utm_content=6553345" target="_blank" rel="noreferrer">Pixabay</a><br/>
                Bild von <a href="https://pixabay.com/de/users/danfador-55851/?utm_source=link-attribution&utm_medium=referral&utm_campaign=image&utm_content=190055" target="_blank" rel="noreferrer">Dan Fador</a> auf <a href="https://pixabay.com/de//?utm_source=link-attribution&utm_medium=referral&utm_campaign=image&utm_content=190055" target="_blank" rel="noreferrer">Pixabay</a>
              </p>
            </div>
            <div className="mt-4 text-right">
              <button
                onClick={() => setShowPhotoCreditsModal(false)}
                className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Error Recovery Test Modal */}
      <TodoistErrorRecoveryTest
        isOpen={errorRecoveryTestOpen}
        onClose={() => setErrorRecoveryTestOpen(false)}
        />
    </>
  );
});

Settings.displayName = 'Settings';

export { Settings };