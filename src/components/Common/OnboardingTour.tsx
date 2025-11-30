import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, ChevronLeft, X, Inbox, CalendarDays, LayoutGrid, FolderKanban, Pin, Check, Sparkles, PanelLeftOpen, FileText, ListChecks, Flag, Smartphone, HardDrive, Clock, Timer, Moon, Palette, Sun } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { format } from 'date-fns';
import type { Task } from '../../types';
import { GuideCursor } from './GuideCursor';

// Preload images for smooth transitions
const preloadImages = (urls: string[]) => {
  urls.forEach(url => {
    const img = new Image();
    img.src = url;
  });
};

// Demo background images to preload (note: most are jpg, bg12-23 are png)
const DEMO_BACKGROUND_IMAGES = [
  '/backgrounds/bg2.jpg',
  '/backgrounds/bg8.jpg',
  '/backgrounds/bg11.jpg',
  '/backgrounds/bg12.png',
  '/backgrounds/bg13.png',
  '/backgrounds/bg14.png',
  '/backgrounds/bg15.png',
  '/backgrounds/bg16.png',
  '/backgrounds/bg17.png',
  '/backgrounds/bg18.png',
  '/backgrounds/bg19.png',
  '/backgrounds/bg20.png',
  '/backgrounds/bg21.png',
  '/backgrounds/bg22.png',
  '/backgrounds/bg23.png'
];

// Check if we're in a PWA/Web context (not Electron)
const isPWA = () => {
  if (typeof window === 'undefined') return false;
  const isElectron = ('electron' in window) || 
    ('require' in window) || 
    (!!(window as any).process?.type) ||
    (!!(window as any).process?.versions?.electron) ||
    (navigator.userAgent.includes('Electron'));
  return !isElectron;
};

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (view: string) => void;
}

type Language = 'de' | 'en';

interface StylingConfig {
  theme: 'light' | 'dark' | 'system';
  accentColor: string;
  backgroundImage: string;
  label: { de: string; en: string };
}

interface TourSubStep {
  title: { de: string; en: string };
  text: { de: string; en: string };
  foxMessage?: { de: string; en: string };
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center-right' | 'center-left' | 'center' | 'bottom-center';
  openTaskModal?: boolean;
  closeTaskModal?: boolean;
  openEndOfDayModal?: boolean;
  closeEndOfDayModal?: boolean;
  showGuideCursor?: boolean; // Show guide cursor pointing to element
  guideCursorTarget?: string; // CSS selector for guide cursor target
  guideCursorClickAnimation?: boolean; // Whether to animate click
  highlightElements?: string[]; // CSS selectors of elements to highlight
  zoomElement?: string; // CSS selector for element to zoom (magnifying glass effect)
  timerScale?: number; // Scale factor for floating timer (e.g., 2 for 200%)
  moveTaskToNextDay?: boolean; // Move example task from today to next day
  createExampleProject?: boolean; // Create example project with columns
  stylingDemo?: boolean; // For the styling demo step
  applyStyling?: StylingConfig; // Styling to apply when entering this step
  restoreOriginalStyling?: boolean; // Restore original styling when entering this step
  startTimer?: boolean; // Start timer for sample task
  openSidebar?: 'tasks' | 'projects' | 'pins'; // Open specific sidebar
}

interface TourSection {
  id: string;
  view: string;
  icon: React.ReactNode;
  steps: TourSubStep[];
}

const SAMPLE_TASK_ID = 'onboarding-sample-task';

const tourSections: TourSection[] = [
    {
      id: 'inbox',
    view: 'inbox',
    icon: <Inbox className="w-5 h-5" />,
    steps: [
      {
        title: { de: 'Willkommen in der Inbox!', en: 'Welcome to the Inbox!' },
        text: { de: 'Hier landen alle neuen Aufgaben. Die Inbox ist der zentrale Sammelplatz für spontane Ideen.', en: 'All new tasks land here. The Inbox is the central collection point for spontaneous ideas.' },
        foxMessage: { de: 'Alles an einem Ort – ich helfe beim Sortieren!', en: 'Everything in one place – I\'ll help sort!' },
        position: 'center'
      },
      {
        title: { de: 'Schnelle Eingabe', en: 'Quick Input' },
        text: { de: 'Das Eingabefeld ermöglicht eine blitzschnelle Aufgabenerfassung.', en: 'The input field enables lightning-fast task entry.' },
        position: 'center',
        showGuideCursor: true,
        guideCursorTarget: '[data-quick-add-button]',
        guideCursorClickAnimation: true
      },
      {
        title: { de: 'Aufgaben organisieren', en: 'Organize Tasks' },
        text: { de: 'Über die Icons können Datum, Projekt oder Pin zugewiesen werden.', en: 'Date, project, or pin can be assigned via the icons.' },
        position: 'center',
        highlightElements: ['[data-onboarding-task-icons]']
      }
    ]
  },
  {
    id: 'taskmodal',
    view: 'inbox',
    icon: <FileText className="w-5 h-5" />,
    steps: [
      {
        title: { de: 'Die Aufgabenansicht', en: 'The Task View' },
        text: { de: 'Jede Aufgabe kann im Detail bearbeitet werden. Die Detailansicht bietet viele Möglichkeiten zur Organisation.', en: 'Each task can be edited in detail. The detail view offers many organizational options.' },
        foxMessage: { de: 'Diese Beispielaufgabe zeigt dir alles!', en: 'This sample task shows you everything!' },
        position: 'center',
        showGuideCursor: true,
        guideCursorTarget: `[data-task-id="${SAMPLE_TASK_ID}"]`,
        guideCursorClickAnimation: true
      },
      {
        title: { de: 'Prioritäten & Beschreibung', en: 'Priorities & Description' },
        text: { de: 'Prioritäten können in drei Stufen gesetzt werden (niedrig, mittel, hoch). Die Beschreibung unterstützt Markdown-Formatierung für detaillierte Notizen.', en: 'Priorities can be set in three levels (low, medium, high). The description supports Markdown formatting for detailed notes.' },
        position: 'center',
        openTaskModal: true,
        highlightElements: ['[data-onboarding-priority]', '[data-onboarding-description]']
      },
      {
        title: { de: 'Unteraufgaben', en: 'Subtasks' },
        text: { de: 'Große Aufgaben lassen sich in kleine Schritte aufteilen. Jede Unteraufgabe kann separat abgehakt werden.', en: 'Large tasks can be broken down into small steps. Each subtask can be checked off separately.' },
        position: 'center',
        openTaskModal: true,
        highlightElements: ['[data-onboarding-subtasks]']
      },
      {
        title: { de: 'Weiter geht\'s', en: 'Let\'s continue' },
        text: { de: 'Jetzt geht es weiter zu den täglichen Funktionen.', en: 'Now we continue with the daily features.' },
        position: 'center',
        closeTaskModal: true
      }
    ]
  },
  {
    id: 'today',
    view: 'today',
    icon: <CalendarDays className="w-5 h-5" />,
    steps: [
      {
        title: { de: 'Dein Tagesüberblick', en: 'Your Daily Overview' },
        text: { de: 'In der Heute-Ansicht werden alle Aufgaben für den aktuellen Tag angezeigt. Am Ende des Tages bietet der Tagesabschluss einen Überblick über die Leistung.', en: 'The Today view shows all tasks for the current day. At the end of the day, the daily summary provides an overview of performance.' },
        foxMessage: { de: 'Ein Schritt nach dem anderen!', en: 'One step at a time!' },
        position: 'center-left',
        openEndOfDayModal: true
      },
      {
        title: { de: 'Tagesabschluss', en: 'End of Day' },
        text: { de: 'Die Tagesabschluss-Übersicht zeigt erledigte Aufgaben, Zeiterfassung und bietet Backup-Optionen. Erledigte Aufgaben werden archiviert, offene können verschoben werden.', en: 'The end-of-day overview shows completed tasks, time tracking, and offers backup options. Completed tasks are archived, open ones can be moved.' },
        foxMessage: { de: 'Regelmäßige Backups empfohlen!', en: 'Regular backups recommended!' },
        position: 'center-left',
        openEndOfDayModal: true
      },
      {
        title: { de: 'Weiter geht\'s', en: 'Let\'s continue' },
        text: { de: 'Als nächstes schauen wir uns die zeitliche Planung im Wochenplaner an.', en: 'Next, we\'ll look at time planning in the weekly planner.' },
        position: 'center',
        closeEndOfDayModal: true
      }
    ]
  },
  {
    id: 'styling',
    view: 'tasks',
    icon: <Palette className="w-5 h-5" />,
    steps: [
      {
        title: { de: 'Dein persönlicher Look', en: 'Your Personal Look' },
        text: { de: 'TaskFuchs passt sich deinem Geschmack an! Es gibt Light- und Darkmode, verschiedene Akzentfarben und Hintergrundbilder zur Auswahl.', en: 'TaskFuchs adapts to your taste! There are light and dark modes, different accent colors, and backgrounds to choose from.' },
        foxMessage: { de: 'Gleich siehst du verschiedene Stil-Varianten!', en: 'You\'ll see different style variants soon!' },
        position: 'center',
        stylingDemo: true
      },
      {
        title: { de: 'Style: Cyan & Dunkel', en: 'Style: Cyan & Dark' },
        text: { de: 'Darkmode mit coolem Cyan-Akzent und atmosphärischem Hintergrund.', en: 'Dark mode with cool cyan accent and atmospheric background.' },
        position: 'center',
        stylingDemo: true,
        applyStyling: {
          theme: 'dark',
          accentColor: '#22d3ee',
          backgroundImage: '/backgrounds/bg2.jpg',
          label: { de: 'Cyan & Dunkel', en: 'Cyan & Dark' }
        }
      },
      {
        title: { de: 'Style: Lila & Dunkel', en: 'Style: Purple & Dark' },
        text: { de: 'Darkmode mit elegantem Lila-Akzent und stimmungsvollem Hintergrund.', en: 'Dark mode with elegant purple accent and moody background.' },
        position: 'center',
        stylingDemo: true,
        applyStyling: {
          theme: 'dark',
          accentColor: '#7b2ff2',
          backgroundImage: '/backgrounds/bg8.jpg',
          label: { de: 'Lila & Dunkel', en: 'Purple & Dark' }
        }
      },
      {
        title: { de: 'Style: Petrol & Hell', en: 'Style: Teal & Light' },
        text: { de: 'Lightmode mit edlem Petrol-Akzent und hellem, freundlichem Hintergrund.', en: 'Light mode with elegant teal accent and bright, friendly background.' },
        position: 'center',
        stylingDemo: true,
        applyStyling: {
          theme: 'light',
          accentColor: '#006d8f',
          backgroundImage: '/backgrounds/bg11.jpg',
          label: { de: 'Petrol & Hell', en: 'Teal & Light' }
        }
      },
      {
        title: { de: 'Deine Einstellungen', en: 'Your Settings' },
        text: { de: 'Wir stellen deine ursprünglichen Einstellungen wieder her. Diese Themes findest du als Presets in den Einstellungen – oder stelle dir dein eigenes zusammen!', en: 'We\'re restoring your original settings. Find these themes as presets in Settings – or create your own combination!' },
        foxMessage: { de: 'In den Einstellungen warten noch mehr Optionen!', en: 'Even more options await in Settings!' },
        position: 'center',
        stylingDemo: true,
        restoreOriginalStyling: true
      }
    ]
  },
  {
    id: 'tasks',
    view: 'tasks',
    icon: <LayoutGrid className="w-5 h-5" />,
    steps: [
      {
        title: { de: 'Der Wochenplaner', en: 'The Weekly Planner' },
        text: { de: 'Deine Aufgaben in Spalten nach Datum – für die perfekte Übersicht.', en: 'Your tasks in columns by date – for the perfect overview.' },
        foxMessage: { de: 'Gute Planung = weniger Stress!', en: 'Good planning = less stress!' },
        position: 'center'
      },
      {
        title: { de: 'Zeitplanung', en: 'Time Planning' },
        text: { de: 'Bei Aufgaben kann eine geschätzte Zeit angegeben werden. Die Gesamtzeit wird oben in jeder Spalte angezeigt – für eine realistische Tagesplanung.', en: 'Estimated time can be added to tasks. Total time is shown at the top of each column – for realistic daily planning.' },
        foxMessage: { de: 'Realistische Planung bringt mehr Erfolg!', en: 'Realistic planning brings more success!' },
        position: 'center',
        highlightElements: ['[data-column-time-today]']
      },
      {
        title: { de: 'Der Timer', en: 'The Timer' },
        text: { de: 'Der Timer kann bei jeder Aufgabe gestartet werden, um fokussiert zu arbeiten. Die Zeit wird getrackt und am Ende des Tages ausgewertet.', en: 'The timer can be started for any task to work focused. Time is tracked and evaluated at the end of the day.' },
        position: 'center',
        startTimer: true,
        timerScale: 2
      },
      {
        title: { de: 'Die Sidebar', en: 'The Sidebar' },
        text: { de: 'Links werden unverplante Projekt-Aufgaben angezeigt. Die Sidebar kann ein- und ausgeklappt werden.', en: 'Unscheduled project tasks are shown on the left. The sidebar can be expanded and collapsed.' },
        position: 'center-left'
      },
      {
        title: { de: 'Drag & Drop', en: 'Drag & Drop' },
        text: { de: 'Aufgaben können per Drag & Drop zwischen Tagen verschoben werden. Gleich siehst du eine Demonstration.', en: 'Tasks can be moved between days via drag & drop. You\'ll see a demonstration now.' },
        position: 'center',
        moveTaskToNextDay: true
      }
    ]
  },
  {
    id: 'projects',
    view: 'kanban',
    icon: <FolderKanban className="w-5 h-5" />,
    steps: [
      {
        title: { de: 'Projekte organisieren', en: 'Organize Projects' },
        text: { de: 'Zusammengehörige Aufgaben können in Projekten gruppiert werden. Ideal für größere Vorhaben.', en: 'Related tasks can be grouped in projects. Ideal for larger initiatives.' },
        foxMessage: { de: 'Große Ziele, kleine Schritte!', en: 'Big goals, small steps!' },
        position: 'center',
        createExampleProject: true
      },
      {
        title: { de: 'Kanban-Workflow', en: 'Kanban Workflow' },
        text: { de: 'Eigene Spalten wie "To Do", "In Arbeit", "Fertig" können erstellt werden. Die Projekt-Sidebar lässt sich auf- und zuklappen.', en: 'Custom columns like "To Do", "In Progress", "Done" can be created. The project sidebar can be expanded and collapsed.' },
        position: 'center'
      }
    ]
  },
  {
    id: 'pins',
    view: 'pins',
    icon: <Pin className="w-5 h-5" />,
    steps: [
      {
        title: { de: 'Dein Fokus-Board', en: 'Your Focus Board' },
        text: { de: 'Wichtige Aufgaben können hier angepinnt werden – unabhängig von Projekt oder Datum. Perfekt für den täglichen Fokus.', en: 'Important tasks can be pinned here – regardless of project or date. Perfect for daily focus.' },
        foxMessage: { de: 'Was wichtig ist, verdient Aufmerksamkeit!', en: 'What\'s important deserves attention!' },
        position: 'center'
      },
      {
        title: { de: 'Eigene Pin-Spalten', en: 'Custom Pin Columns' },
        text: { de: 'Spalten wie "Diese Woche" oder "Dringend" können individuell erstellt werden. Die Aufgaben-Sidebar lässt sich auf- und zuklappen.', en: 'Columns like "This Week" or "Urgent" can be created individually. The task sidebar can be expanded and collapsed.' },
        position: 'center'
      }
    ]
  },
  {
    id: 'complete',
    view: 'today',
    icon: <Sparkles className="w-5 h-5" />,
    steps: [
      {
        title: { de: 'Geschafft!', en: 'All Done!' },
        text: { de: 'Alle wichtigen Bereiche von TaskFuchs sind jetzt bekannt. Die Einführung ist abgeschlossen!', en: 'All important areas of TaskFuchs are now familiar. The introduction is complete!' },
        foxMessage: { de: 'Viel Erfolg mit deiner smarten Planung! 🦊', en: 'Good luck with your smart planning! 🦊' },
        position: 'center'
      }
    ]
  }
];

// Get fox image path that works in both web and Electron
const getFoxImagePath = () => {
  const basePath = (window as any).__ELECTRON__ ? '.' : '';
  return `${basePath}/3d_fox.png`;
};

// Create a sample task for the onboarding
const createSampleTask = (pinColumnId?: string, withDate: boolean = false): Task => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const now = new Date().toISOString();
  
  return {
    id: SAMPLE_TASK_ID,
    title: 'Example Inbox task',
    description: `## Your First Task 🦊

This is a **sample task** to show you how TaskFuchs works.

### Features you can use:
- **Markdown formatting** in descriptions
- *Italic*, **bold**, and \`code\` text
- Lists and checklists
- Links and more!

> Pro tip: Use the timer to track your time on tasks.`,
    completed: false,
    priority: 'high',
    estimatedTime: 30,
    tags: ['demo'],
    subtasks: [
      {
        id: 'subtask-1',
        title: 'Explore the Inbox',
        completed: false,
        tags: [],
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'subtask-2', 
        title: 'Check out the Planner',
        completed: false,
        tags: [],
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'subtask-3',
        title: 'Create your first project',
        completed: false,
        tags: [],
        createdAt: now,
        updatedAt: now
      }
    ],
    columnId: withDate ? `date-${today}` : 'inbox',
    reminderDate: withDate ? today : undefined,
    pinColumnId: pinColumnId,
    pinned: !!pinColumnId,
    createdAt: now,
    updatedAt: now,
    position: 0
  };
};

// PWA-specific section (only shown for web apps)
const pwaSections: TourSection[] = isPWA() ? [
  {
    id: 'pwa',
    view: 'today',
    icon: <Smartphone className="w-5 h-5" />,
    steps: [
      {
        title: { de: 'TaskFuchs als Web-App', en: 'TaskFuchs as Web App' },
        text: { de: 'TaskFuchs ist eine Progressive Web App (PWA). Sie läuft im Browser ohne Installation. Deine Daten werden lokal auf deinem Gerät gespeichert.', en: 'TaskFuchs is a Progressive Web App (PWA). It runs in your browser without installation. Your data is stored locally on your device.' },
        foxMessage: { de: 'Schnell, sicher und überall verfügbar!', en: 'Fast, secure, and available everywhere!' },
        position: 'center'
      },
      {
        title: { de: 'App installieren', en: 'Install the App' },
        text: { de: 'TaskFuchs kann wie eine echte App installiert werden:\n\n• Chrome/Edge: Installieren-Symbol in der Adressleiste (⊕) oder Menü → „App installieren"\n• Safari (iOS): Teilen-Button → „Zum Home-Bildschirm"\n• Firefox: Menü → „Seite zum Startbildschirm hinzufügen"', en: 'TaskFuchs can be installed like a real app:\n\n• Chrome/Edge: Install icon in the address bar (⊕) or Menu → "Install app"\n• Safari (iOS): Share button → "Add to Home Screen"\n• Firefox: Menu → "Add page to Home Screen"' },
        foxMessage: { de: 'So bin ich immer griffbereit!', en: 'This way I\'m always at hand!' },
        position: 'center'
      },
      {
        title: { de: 'Backups sind wichtig!', en: 'Backups are important!' },
        text: { de: 'Da deine Daten lokal gespeichert werden, empfehlen sich regelmäßige Backups. Der Backup-Button in der Sidebar ermöglicht schnelles Sichern am Ende jedes Arbeitstages.', en: 'Since your data is stored locally, regular backups are recommended. The backup button in the sidebar enables quick saving at the end of each work day.' },
        foxMessage: { de: 'Lieber einmal zu oft sichern!', en: 'Better safe than sorry!' },
        position: 'center-right',
        zoomElement: '[data-backup-button]'
      },
      {
        title: { de: 'Backup einrichten', en: 'Setup Backup' },
        text: { de: 'Beim ersten Klick wird ein Speicherort ausgewählt. Danach genügt ein Klick für schnelle Backups. Wiederherstellung über Einstellungen → Daten.', en: 'On first click, a save location is selected. After that, one click creates quick backups. Restore via Settings → Data.' },
        position: 'center'
      }
    ]
  }
] : [];

// Combine PWA sections with regular sections
const getAllTourSections = () => [...pwaSections, ...tourSections];

// Language Selection Modal with Toggle Switch
interface LanguageSelectionModalProps {
  isDark: boolean;
  accentColor: string;
  onSelect: (lang: Language) => void;
  onSkip: () => void;
}

function LanguageSelectionModal({ isDark, accentColor, onSelect, onSkip }: LanguageSelectionModalProps) {
  const [selectedLang, setSelectedLang] = useState<Language>('de');
  
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
      <div 
        className="absolute inset-0 bg-black/20"
        onClick={onSkip}
      />
      <div 
        className="relative w-full max-w-sm mx-4 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 fade-in duration-300"
        style={{
          background: isDark 
            ? 'linear-gradient(135deg, rgba(30,41,59,0.98) 0%, rgba(15,23,42,0.98) 100%)'
            : 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(250,250,252,0.98) 100%)',
          border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.8)',
        }}
      >
        {/* Fox */}
        <div className="flex justify-center pt-6 pb-3">
          <img 
            src={getFoxImagePath()}
            alt="TaskFuchs" 
            className="w-[136px] h-[136px] object-contain"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              if (img.src.includes('/3d_fox.png')) img.src = './3d_fox.png';
            }}
            style={{ animation: 'bounce-gentle 2s ease-in-out infinite' }}
          />
        </div>
        
        {/* Title & Language Toggle */}
        <div className="text-center px-6 pb-4">
          <h1 className={`text-xl font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {selectedLang === 'de' ? 'Bereit für die Einführung?' : 'Ready for the introduction?'}
          </h1>
          
          {/* Language Toggle Switch */}
          <div 
            className="inline-flex items-center rounded-full p-1 gap-1"
            style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
          >
            <button
              onClick={() => setSelectedLang('de')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                selectedLang === 'de' 
                  ? 'text-white shadow-sm' 
                  : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
              }`}
              style={{ backgroundColor: selectedLang === 'de' ? accentColor : 'transparent' }}
            >
              Deutsch
            </button>
            <button
              onClick={() => setSelectedLang('en')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                selectedLang === 'en' 
                  ? 'text-white shadow-sm' 
                  : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
              }`}
              style={{ backgroundColor: selectedLang === 'en' ? accentColor : 'transparent' }}
            >
              English
            </button>
          </div>
        </div>
        
        {/* Start Button */}
        <div className="px-6 pb-6">
          <button
            onClick={() => onSelect(selectedLang)}
            className="w-full py-3 px-4 rounded-xl font-semibold text-white text-base transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
            style={{ backgroundColor: accentColor }}
          >
            {selectedLang === 'de' ? 'Einführung starten' : 'Start Introduction'}
          </button>
          <button
            onClick={onSkip}
            className={`w-full mt-2 py-2 text-sm transition-colors ${
              isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {selectedLang === 'de' ? 'Überspringen' : 'Skip'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function OnboardingTour({ isOpen, onClose, onNavigate }: OnboardingTourProps) {
  const { state, dispatch } = useApp();
  
  // Restore state from sessionStorage if available (survives re-renders and StrictMode)
  const getStoredState = useCallback(() => {
    try {
      const stored = sessionStorage.getItem('taskfuchs-onboarding-state');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore parsing errors
    }
    return null;
  }, []);
  
  const storedState = getStoredState();
  
  const [language, setLanguage] = useState<Language | null>(storedState?.language || null);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(storedState?.sectionIndex || 0);
  const [currentStepIndex, setCurrentStepIndex] = useState(storedState?.stepIndex || 0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [sampleTaskCreated, setSampleTaskCreated] = useState(storedState?.sampleTaskCreated || false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  
  // Guide cursor state
  const [showGuideCursor, setShowGuideCursor] = useState(false);
  const [guideCursorTarget, setGuideCursorTarget] = useState<string>('');
  const [isNavigationCursor, setIsNavigationCursor] = useState(false); // Distinguish navigation vs step-specific cursor
  const pendingNavigationRef = useRef<{ view: string; sectionIndex: number; stepIndex: number } | null>(null);
  
  // Styling demo state - save original settings when entering styling section
  const originalSettingsRef = useRef<{
    theme: 'light' | 'dark' | 'system';
    accentColor: string;
    backgroundImage: string;
  } | null>(null);
  
  const accentColor = state.preferences.accentColor;
  
  // Get the complete tour sections (including PWA if applicable)
  const allTourSections = React.useMemo(() => getAllTourSections(), []);
  
  // Persist current state to sessionStorage whenever it changes
  useEffect(() => {
    if (isOpen && language) {
      sessionStorage.setItem('taskfuchs-onboarding-state', JSON.stringify({
        language,
        sectionIndex: currentSectionIndex,
        stepIndex: currentStepIndex,
        sampleTaskCreated
      }));
    }
  }, [isOpen, language, currentSectionIndex, currentStepIndex, sampleTaskCreated]);
  
  // Track previous open state to detect fresh opens
  const prevIsOpenRef = useRef(false);
  
  // Initialize/reset state when opening fresh (no stored state)
  useEffect(() => {
    const wasOpen = prevIsOpenRef.current;
    prevIsOpenRef.current = isOpen;
    
    if (!isOpen) {
      // When closing, we don't clear state here (it's cleared when starting fresh from menu)
      return;
    }
    
    // Opening - ALWAYS reset to initial state (onboarding always starts from beginning)
    if (isOpen && !wasOpen) {
      // Reset everything for a fresh start
      setLanguage(null);
      setCurrentSectionIndex(0);
      setCurrentStepIndex(0);
      setDontShowAgain(false);
      setSampleTaskCreated(false);
      setShowTaskModal(false);
      originalSettingsRef.current = null;
      
      // Clear sessionStorage to ensure fresh start
      sessionStorage.removeItem('taskfuchs-onboarding-state');
      
      // Preload demo background images for smooth transitions
      preloadImages(DEMO_BACKGROUND_IMAGES);
    }
  }, [isOpen]);
  
  // Track previous section to detect entering/leaving styling section
  const prevSectionIdRef = useRef<string | null>(null);
  const stylingSectionEntered = useRef(false);
  
  // Handle styling demo - save original settings and apply styling per step
  useEffect(() => {
    const currentSection = allTourSections[currentSectionIndex];
    const currentStep = currentSection?.steps[currentStepIndex];
    const prevSectionId = prevSectionIdRef.current;
    const isEnteringStyling = currentSection?.id === 'styling' && prevSectionId !== 'styling';
    const isLeavingStyling = prevSectionId === 'styling' && currentSection?.id !== 'styling';
    
    // Update prev section id for next render
    prevSectionIdRef.current = currentSection?.id || null;
    
    // Entering styling section - save original settings (using ref to capture current values)
    if (isEnteringStyling && !stylingSectionEntered.current) {
      stylingSectionEntered.current = true;
      // Read current state values directly
      const prefs = state.preferences;
      originalSettingsRef.current = {
        theme: prefs.theme as 'light' | 'dark' | 'system',
        accentColor: prefs.accentColor,
        backgroundImage: prefs.backgroundImage || ''
      };
    }
    
    // Helper to apply dark mode class immediately
    const applyDarkModeClass = (theme: 'light' | 'dark' | 'system') => {
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
      } else if (theme === 'light') {
        root.classList.remove('dark');
      } else {
        // System theme
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
    };
    
    // Apply styling when in styling section
    if (currentSection?.id === 'styling') {
      if (currentStep?.applyStyling) {
        // Apply dark mode class immediately for instant visual feedback
        applyDarkModeClass(currentStep.applyStyling.theme);
        
    dispatch({ 
      type: 'UPDATE_PREFERENCES', 
          payload: {
            theme: currentStep.applyStyling.theme,
            accentColor: currentStep.applyStyling.accentColor,
            backgroundImage: currentStep.applyStyling.backgroundImage
          }
        });
      } else if (currentStep?.restoreOriginalStyling && originalSettingsRef.current) {
        // Apply dark mode class immediately for instant visual feedback
        applyDarkModeClass(originalSettingsRef.current.theme);
        
        // Restore original settings
        dispatch({
          type: 'UPDATE_PREFERENCES',
          payload: {
            theme: originalSettingsRef.current.theme,
            accentColor: originalSettingsRef.current.accentColor,
            backgroundImage: originalSettingsRef.current.backgroundImage
          }
        });
      }
    }
    
    // Leaving styling section - restore original settings
    if (isLeavingStyling && originalSettingsRef.current) {
      // Apply dark mode class immediately for instant visual feedback
      applyDarkModeClass(originalSettingsRef.current.theme);
      
      dispatch({
        type: 'UPDATE_PREFERENCES',
        payload: {
          theme: originalSettingsRef.current.theme,
          accentColor: originalSettingsRef.current.accentColor,
          backgroundImage: originalSettingsRef.current.backgroundImage
        }
      });
      originalSettingsRef.current = null;
      stylingSectionEntered.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSectionIndex, currentStepIndex]);
  
  // Create sample task when language is selected (without date for Inbox, no pin)
  useEffect(() => {
    if (isOpen && language && !sampleTaskCreated) {
      // Create WITHOUT pinColumnId so it appears in Inbox
      const sampleTask = createSampleTask(undefined, false); // No pin, no date (for Inbox)
      
      // Check if sample task already exists
      const existingTask = state.tasks.find(t => t.id === SAMPLE_TASK_ID);
      if (!existingTask) {
        dispatch({ type: 'ADD_TASK', payload: sampleTask });
      } else {
        // Reset it to inbox state (no date, no pin)
        dispatch({ type: 'UPDATE_TASK', payload: sampleTask });
      }
      setSampleTaskCreated(true);
    }
  }, [isOpen, language, sampleTaskCreated, state.tasks, dispatch]);
  
  // Cleanup: Delete sample task when onboarding closes
  useEffect(() => {
    if (!isOpen && sampleTaskCreated) {
      const sampleTask = state.tasks.find(t => t.id === SAMPLE_TASK_ID);
      if (sampleTask) {
        dispatch({ type: 'DELETE_TASK', payload: SAMPLE_TASK_ID });
        setSampleTaskCreated(false);
      }
    }
  }, [isOpen, sampleTaskCreated, state.tasks, dispatch]);
  
  // Add date to sample task when entering "today" section, remove when back in inbox
  useEffect(() => {
    const currentSection = allTourSections[currentSectionIndex];
    
    if (currentSection?.id === 'today' && sampleTaskCreated) {
      const sampleTask = state.tasks.find(t => t.id === SAMPLE_TASK_ID);
      if (sampleTask && !sampleTask.reminderDate) {
        const today = format(new Date(), 'yyyy-MM-dd');
        dispatch({
          type: 'UPDATE_TASK',
          payload: {
            ...sampleTask,
            reminderDate: today,
            columnId: `date-${today}`
          }
        });
      }
    } else if (currentSection?.id === 'inbox' && sampleTaskCreated) {
      // Remove date when back in inbox section
      const sampleTask = state.tasks.find(t => t.id === SAMPLE_TASK_ID);
      if (sampleTask && sampleTask.reminderDate) {
        dispatch({
          type: 'UPDATE_TASK',
          payload: {
            ...sampleTask,
            reminderDate: undefined,
            columnId: 'inbox'
          }
        });
      }
    }
  }, [currentSectionIndex, sampleTaskCreated, state.tasks, dispatch, allTourSections]);
  
  // Expand all sidebars when tour starts
  useEffect(() => {
    if (isOpen && language) {
      window.dispatchEvent(new CustomEvent('task-sidebar-state-changed', { detail: { minimized: false } }));
      window.dispatchEvent(new CustomEvent('project-sidebar-state-changed', { detail: { minimized: false } }));
      window.dispatchEvent(new CustomEvent('pins-sidebar-state-changed', { detail: { minimized: false } }));
    }
  }, [isOpen, language]);
  
  // Handle guide cursor for step-specific UI highlights (not for navigation)
  useEffect(() => {
    if (!isOpen || !language) return;
    
    // Skip if this is a navigation cursor
    if (isNavigationCursor) {
      setShowGuideCursor(false);
      setGuideCursorTarget('');
      return;
    }
    
    const currentSection = allTourSections[currentSectionIndex];
    const currentStep = currentSection?.steps[currentStepIndex];
    
    // Show guide cursor for step-specific highlights
    if (currentStep?.showGuideCursor && currentStep?.guideCursorTarget) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        setShowGuideCursor(true);
        setGuideCursorTarget(currentStep.guideCursorTarget || '');
      }, 100);
      
      return () => clearTimeout(timer);
    } else {
      setShowGuideCursor(false);
      setGuideCursorTarget('');
    }
  }, [isOpen, language, currentSectionIndex, currentStepIndex, allTourSections, isNavigationCursor]);
  
  // Handle task modal visibility based on current step
  useEffect(() => {
    const currentSection = allTourSections[currentSectionIndex];
    const currentStep = currentSection?.steps[currentStepIndex];
    
    if (currentStep?.openTaskModal && sampleTaskCreated) {
      // Add class to body for TaskModal positioning during onboarding
      document.body.classList.add('onboarding-taskmodal-active');
      // Open the sample task modal
      window.dispatchEvent(new CustomEvent('open-task-modal', { 
        detail: { taskId: SAMPLE_TASK_ID } 
      }));
      setShowTaskModal(true);
    } else if (currentStep?.closeTaskModal || (showTaskModal && !currentStep?.openTaskModal)) {
      // Remove class and close the task modal
      document.body.classList.remove('onboarding-taskmodal-active');
      window.dispatchEvent(new CustomEvent('close-task-modal'));
      setShowTaskModal(false);
    }
    
    return () => {
      document.body.classList.remove('onboarding-taskmodal-active');
    };
  }, [currentSectionIndex, currentStepIndex, sampleTaskCreated, showTaskModal, allTourSections]);
  
  // Handle End of Day modal visibility based on current step
  useEffect(() => {
    const currentSection = allTourSections[currentSectionIndex];
    const currentStep = currentSection?.steps[currentStepIndex];
    
    if (currentStep?.openEndOfDayModal) {
      // Open the End of Day modal
      window.dispatchEvent(new CustomEvent('open-end-of-day-modal'));
    } else if (currentStep?.closeEndOfDayModal) {
      // Close the End of Day modal
      window.dispatchEvent(new CustomEvent('close-end-of-day-modal'));
    }
  }, [currentSectionIndex, currentStepIndex, allTourSections]);
  
  // Handle element highlights
  useEffect(() => {
    const currentSection = allTourSections[currentSectionIndex];
    const currentStep = currentSection?.steps[currentStepIndex];
    
    if (currentStep?.highlightElements) {
      // Add delay to ensure DOM is ready
      const timer = setTimeout(() => {
        // Add highlight class to specified elements
        const elements = currentStep.highlightElements!.map(selector => {
          const el = document.querySelector(selector);
          if (!el) {
            console.warn(`[Onboarding] Highlight element not found: ${selector}`);
          }
          return el;
        }).filter(Boolean);
        
        console.log(`[Onboarding] Highlighting ${elements.length} elements:`, currentStep.highlightElements);
        
        elements.forEach(el => {
          el?.classList.add('onboarding-highlight');
        });
      }, 300);
      
      return () => {
        clearTimeout(timer);
        // Remove highlight class
        currentStep.highlightElements!.forEach(selector => {
          const el = document.querySelector(selector);
          el?.classList.remove('onboarding-highlight');
        });
      };
    }
  }, [currentSectionIndex, currentStepIndex, allTourSections]);
  
  // Example project creation - TODO: Implement properly with correct project structure
  // useEffect(() => {
  //   const currentSection = allTourSections[currentSectionIndex];
  //   const currentStep = currentSection?.steps[currentStepIndex];
  //   
  //   if (currentStep?.createExampleProject) {
  //     // TODO: Create example project with proper structure
  //   }
  // }, [currentSectionIndex, currentStepIndex, allTourSections]);
  
  // Handle task move to next day (for DnD demo)
  useEffect(() => {
    const currentSection = allTourSections[currentSectionIndex];
    const currentStep = currentSection?.steps[currentStepIndex];
    
    if (currentStep?.moveTaskToNextDay) {
      // Find sample task and move it to next day
      const sampleTask = state.tasks.find(t => t.id === SAMPLE_TASK_ID);
      if (sampleTask) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');
        
        // Update task with tomorrow's date
        dispatch({
          type: 'UPDATE_TASK',
          payload: {
            ...sampleTask,
            reminderDate: tomorrowStr,
            columnId: `date-${tomorrowStr}`
          }
        });
      }
    }
  }, [currentSectionIndex, currentStepIndex, state.tasks, dispatch, allTourSections]);
  
  // Ref to track if timer was started during onboarding (to avoid re-starting)
  const timerStartedRef = useRef(false);
  const originalTimerModeRef = useRef<'topBar' | 'floatingWidget' | 'separateWindow' | null>(null);
  
  // Handle timer start based on current step - don't stop on step change
  useEffect(() => {
    const currentSection = allTourSections[currentSectionIndex];
    const currentStep = currentSection?.steps[currentStepIndex];
    
    if (currentStep?.startTimer && !timerStartedRef.current) {
      // Store original timer mode
      originalTimerModeRef.current = state.preferences.timerDisplayMode;
      
      // Set timer display mode to floatingWidget
    dispatch({ 
      type: 'UPDATE_PREFERENCES', 
        payload: { timerDisplayMode: 'floatingWidget' }
      });
      
      // Find sample task
      const sampleTask = state.tasks.find(t => t.id === SAMPLE_TASK_ID);
      if (sampleTask && !state.activeTimer?.isActive) {
        // Start timer for sample task
        dispatch({
          type: 'START_TIMER',
          payload: {
            taskId: sampleTask.id
          }
        });
        timerStartedRef.current = true;
      }
    }
    // No cleanup here - timer stays running until onboarding ends
  }, [currentSectionIndex, currentStepIndex, state.tasks, state.activeTimer?.isActive, state.preferences.timerDisplayMode, dispatch, allTourSections]);
  
  // Highlight effect for elements (subtle glow on the element itself)
  useEffect(() => {
    const currentSection = allTourSections[currentSectionIndex];
    const currentStep = currentSection?.steps[currentStepIndex];
    
    if (currentStep?.zoomElement) {
      const timer = setTimeout(() => {
        const el = document.querySelector(currentStep.zoomElement!) as HTMLElement;
        if (el) {
          // Add highlight class directly to the element
          el.classList.add('onboarding-element-highlight');
          el.style.setProperty('--highlight-color', accentColor);
          
          // Add keyframes if not exists
          if (!document.getElementById('element-highlight-keyframes')) {
            const style = document.createElement('style');
            style.id = 'element-highlight-keyframes';
            style.textContent = `
              .onboarding-element-highlight {
                position: relative;
                z-index: 10000 !important;
                animation: element-glow 1.5s ease-in-out infinite !important;
                border-radius: 12px;
              }
              @keyframes element-glow {
                0%, 100% { 
                  box-shadow: 0 0 0 3px var(--highlight-color, #f97316), 
                              0 0 20px var(--highlight-color, #f97316),
                              0 0 40px rgba(249, 115, 22, 0.4) !important;
                  transform: scale(1.05);
                }
                50% { 
                  box-shadow: 0 0 0 5px var(--highlight-color, #f97316), 
                              0 0 30px var(--highlight-color, #f97316),
                              0 0 60px rgba(249, 115, 22, 0.5) !important;
                  transform: scale(1.1);
                }
              }
            `;
            document.head.appendChild(style);
          }
        }
      }, 300);
      
      return () => {
        clearTimeout(timer);
        // Remove highlight from element
        const el = document.querySelector(currentStep.zoomElement!) as HTMLElement;
        if (el) {
          el.classList.remove('onboarding-element-highlight');
          el.style.removeProperty('--highlight-color');
        }
      };
    }
  }, [currentSectionIndex, currentStepIndex, allTourSections]);
  
  // Timer scale effect
  useEffect(() => {
    const currentSection = allTourSections[currentSectionIndex];
    const currentStep = currentSection?.steps[currentStepIndex];
    
    const timerWidget = document.querySelector('[data-floating-timer]') as HTMLElement;
    if (timerWidget) {
      if (currentStep?.timerScale) {
        timerWidget.style.transform = `scale(${currentStep.timerScale})`;
        timerWidget.style.transition = 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)';
      } else {
        timerWidget.style.transform = '';
      }
    }
    
    return () => {
      if (timerWidget) {
        timerWidget.style.transform = '';
      }
    };
  }, [currentSectionIndex, currentStepIndex, allTourSections]);
  
  // Calculate total progress
  const totalSteps = allTourSections.reduce((acc, section) => acc + section.steps.length, 0);
  const currentTotalStep = allTourSections.slice(0, currentSectionIndex).reduce((acc, section) => acc + section.steps.length, 0) + currentStepIndex + 1;
  
  const currentSection = allTourSections[currentSectionIndex];
  const currentStep = currentSection?.steps[currentStepIndex];
  
  // Debug: Log section and step
  console.log('[Onboarding] Current state:', {
    currentSectionIndex,
    currentStepIndex,
    totalSections: allTourSections.length,
    currentSectionId: currentSection?.id,
    currentStepTitle: currentStep?.title?.de,
    hasSection: !!currentSection,
    hasStep: !!currentStep
  });
  
  // Map view to sidebar button selector
  const getViewSelector = useCallback((view: string): string | null => {
    switch (view) {
      case 'inbox':
        return '[data-nav-item="inbox"]';
      case 'today':
        return '[data-nav-item="today"]';
      case 'tasks':
        return '[data-nav-item="tasks"]';
      case 'kanban':
        return '[data-nav-item="kanban"]';
      case 'pins':
        return '[data-nav-item="pins"]';
      default:
        return null;
    }
  }, []);

  // Navigate to the current section's view
  const navigateToView = useCallback((view: string) => {
    if (onNavigate) {
      onNavigate(view);
    }
  }, [onNavigate]);
  
  // Navigate with guide cursor animation
  const navigateToViewWithCursor = useCallback((view: string, sectionIndex: number, stepIndex: number) => {
    const selector = getViewSelector(view);
    
    if (!selector) {
      // No cursor needed, navigate directly
      console.log('[Onboarding] Direct navigation (no selector):', { view, sectionIndex, stepIndex });
      navigateToView(view);
      setCurrentSectionIndex(sectionIndex);
      setCurrentStepIndex(stepIndex);
      setTimeout(() => setIsAnimating(false), 200);
      return;
    }
    
    // Check if target element exists before showing cursor
    const targetElement = document.querySelector(selector);
    if (!targetElement) {
      // Element not found, navigate directly without cursor
      console.log('[Onboarding] Target not found, direct navigation:', { view, sectionIndex, stepIndex, selector });
      navigateToView(view);
      setCurrentSectionIndex(sectionIndex);
      setCurrentStepIndex(stepIndex);
      setTimeout(() => setIsAnimating(false), 200);
      return;
    }
    
    // Store pending navigation
    pendingNavigationRef.current = { view, sectionIndex, stepIndex };
    
    // Show guide cursor for navigation
    setIsNavigationCursor(true);
    setGuideCursorTarget(selector);
    setShowGuideCursor(true);
    
    // Fallback: If cursor doesn't complete within 2 seconds, navigate anyway
    setTimeout(() => {
      if (pendingNavigationRef.current) {
        console.log('[Onboarding] Fallback navigation (timeout):', pendingNavigationRef.current);
        const { view: v, sectionIndex: s, stepIndex: st } = pendingNavigationRef.current;
        navigateToView(v);
        setCurrentSectionIndex(s);
        setCurrentStepIndex(st);
        pendingNavigationRef.current = null;
        setIsNavigationCursor(false);
        setShowGuideCursor(false);
        setIsAnimating(false);
      }
    }, 2000);
  }, [getViewSelector, navigateToView]);
  
  // Handle guide cursor animation complete
  const handleGuideCursorComplete = useCallback(() => {
    setShowGuideCursor(false);
    
    // Execute pending navigation (for view transitions)
    // Always check pendingNavigationRef - don't rely on isNavigationCursor state
    if (pendingNavigationRef.current) {
      const { view, sectionIndex, stepIndex } = pendingNavigationRef.current;
      console.log('[Onboarding] GuideCursor complete, navigating to:', { view, sectionIndex, stepIndex });
      navigateToView(view);
      setCurrentSectionIndex(sectionIndex);
      setCurrentStepIndex(stepIndex);
      pendingNavigationRef.current = null;
      setIsNavigationCursor(false);
      
      // Reset animation state after navigation
      setTimeout(() => setIsAnimating(false), 200);
    } else {
      // For non-navigation cursors (UI highlights), just reset states
      setIsNavigationCursor(false);
      setTimeout(() => setIsAnimating(false), 200);
    }
  }, [navigateToView]);
  
  // Go to next step or section - stable version without stale closures
  const handleNext = useCallback(() => {
    if (isAnimating) return; // Prevent double-clicks
    
    const section = allTourSections[currentSectionIndex];
    if (!section) return;
    
    const stepsCount = section.steps.length;
    
    setIsAnimating(true);
    
    if (currentStepIndex < stepsCount - 1) {
      // More steps in current section - no navigation needed
      setCurrentStepIndex(currentStepIndex + 1);
      setTimeout(() => setIsAnimating(false), 100);
    } else if (currentSectionIndex < allTourSections.length - 1) {
      // Move to next section
      const nextSection = allTourSections[currentSectionIndex + 1];
      const currentView = section.view;
      const nextView = nextSection.view;
      
      console.log('[Onboarding] Moving to next section:', {
        from: section.id,
        to: nextSection.id,
        fromView: currentView,
        toView: nextView
      });
      
      // Show guide cursor when navigating to a different view
      if (currentView !== nextView) {
        navigateToViewWithCursor(nextView, currentSectionIndex + 1, 0);
      } else {
        // Same view - navigate directly
        navigateToView(nextView);
        setCurrentSectionIndex(currentSectionIndex + 1);
        setCurrentStepIndex(0);
        setTimeout(() => setIsAnimating(false), 150);
      }
    } else {
      // No more sections
      setTimeout(() => setIsAnimating(false), 200);
    }
  }, [currentStepIndex, currentSectionIndex, allTourSections, navigateToView, navigateToViewWithCursor, isAnimating]);
  
  // Go to previous step or section - stable version without stale closures
  const handlePrev = useCallback(() => {
    if (isAnimating) return; // Prevent double-clicks
    
    setIsAnimating(true);
    
    if (currentStepIndex > 0) {
      // Previous step in current section - no navigation needed
      setCurrentStepIndex(currentStepIndex - 1);
      setTimeout(() => setIsAnimating(false), 100);
    } else if (currentSectionIndex > 0) {
      // Move to previous section, last step with guide cursor
      const prevSection = allTourSections[currentSectionIndex - 1];
      const currentSection = allTourSections[currentSectionIndex];
      const currentView = currentSection?.view;
      const prevView = prevSection?.view;
      
      if (prevSection && currentView !== prevView) {
        // Different view - show guide cursor
        navigateToViewWithCursor(prevView, currentSectionIndex - 1, prevSection.steps.length - 1);
      } else if (prevSection) {
        // Same view - direct navigation
        setCurrentSectionIndex(currentSectionIndex - 1);
        setCurrentStepIndex(prevSection.steps.length - 1);
        setTimeout(() => setIsAnimating(false), 200);
      }
    } else {
      // Already at first step
      setTimeout(() => setIsAnimating(false), 200);
    }
  }, [currentStepIndex, currentSectionIndex, allTourSections, navigateToViewWithCursor, isAnimating]);
  
  const handleComplete = useCallback(() => {
    // Close task modal if open
    if (showTaskModal) {
      window.dispatchEvent(new CustomEvent('close-task-modal'));
    }
    
    // Stop timer if running and restore original mode
    if (state.activeTimer?.isActive) {
      dispatch({ type: 'STOP_TIMER' });
    }
    if (originalTimerModeRef.current) {
      dispatch({
        type: 'UPDATE_PREFERENCES',
        payload: { timerDisplayMode: originalTimerModeRef.current }
      });
    }
    timerStartedRef.current = false;
    
    // Delete sample task
    const sampleTask = state.tasks.find(t => t.id === SAMPLE_TASK_ID);
    if (sampleTask) {
      dispatch({ type: 'DELETE_TASK', payload: SAMPLE_TASK_ID });
    }
    
    if (dontShowAgain) {
    dispatch({ 
      type: 'UPDATE_PREFERENCES', 
      payload: { hasCompletedOnboarding: true } 
    });
    }
    onClose();
  }, [dispatch, onClose, dontShowAgain, showTaskModal, state.tasks, state.activeTimer]);
  
  const handleSkip = useCallback(() => {
    // Close task modal if open
    if (showTaskModal) {
      window.dispatchEvent(new CustomEvent('close-task-modal'));
    }
    
    // Stop timer if running and restore original mode
    if (state.activeTimer?.isActive) {
      dispatch({ type: 'STOP_TIMER' });
    }
    if (originalTimerModeRef.current) {
      dispatch({
        type: 'UPDATE_PREFERENCES',
        payload: { timerDisplayMode: originalTimerModeRef.current }
      });
    }
    timerStartedRef.current = false;
    
    // Delete sample task
    const sampleTask = state.tasks.find(t => t.id === SAMPLE_TASK_ID);
    if (sampleTask) {
      dispatch({ type: 'DELETE_TASK', payload: SAMPLE_TASK_ID });
    }
    
    onClose();
  }, [onClose, showTaskModal, state.tasks, dispatch, state.activeTimer]);
  
  const handleLanguageSelect = useCallback((lang: Language) => {
    setLanguage(lang);
    
    // Navigate to first section's view with guide cursor
    const firstSection = allTourSections[0];
    if (firstSection) {
      const selector = getViewSelector(firstSection.view);
      
      if (selector) {
        // Show guide cursor for first navigation
        pendingNavigationRef.current = { view: firstSection.view, sectionIndex: 0, stepIndex: 0 };
        setIsNavigationCursor(true);
        setGuideCursorTarget(selector);
        setShowGuideCursor(true);
      } else {
        // Direct navigation if no selector
        setCurrentSectionIndex(0);
        setCurrentStepIndex(0);
        navigateToView(firstSection.view);
      }
    }
  }, [navigateToView, allTourSections, getViewSelector]);
  
  // Keyboard navigation
  useEffect(() => {
    if (!isOpen || !language) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Get current section safely
      const section = allTourSections[currentSectionIndex];
      if (!section) return;
      
      const isLastSection = currentSectionIndex === allTourSections.length - 1;
      const isLastStepInSection = currentStepIndex === section.steps.length - 1;
      
      if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (isLastSection && isLastStepInSection) {
          handleComplete();
        } else {
          handleNext();
        }
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'Escape') {
        handleSkip();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, language, currentSectionIndex, currentStepIndex, allTourSections, handleNext, handlePrev, handleComplete, handleSkip]);

  if (!isOpen) return null;
  
  // Safety check - ensure we have valid section and step (only when language is selected)
  // When language is null, we show the language selection modal, so don't return null
  if (language && (!currentSection || !currentStep)) {
    // Reset to beginning if something went wrong
    if (currentSectionIndex !== 0 || currentStepIndex !== 0) {
      setCurrentSectionIndex(0);
      setCurrentStepIndex(0);
    }
    // Don't return null immediately - wait for state to update
    // This prevents the onboarding from flickering off
    return null;
  }
  
  // If allTourSections is empty (shouldn't happen), show a fallback
  if (allTourSections.length === 0) {
    console.error('[Onboarding] No tour sections available!');
    return null;
  }

  const t = (obj: { de: string; en: string } | undefined) => obj ? (language ? obj[language] : obj.de) : '';
  
  // Position classes for the modal
  const getPositionClasses = (position: string, isTaskModalOpen: boolean) => {
    // When TaskModal is open during onboarding, position explanation on left
    if (isTaskModalOpen) {
      return 'top-1/2 -translate-y-1/2 left-6 sm:left-24';
    }
    
    switch (position) {
      case 'bottom-right': return 'bottom-6 right-6';
      case 'bottom-left': return 'bottom-6 left-6 sm:left-24';
      case 'bottom-center': return 'bottom-6 left-1/2 -translate-x-1/2';
      case 'top-right': return 'top-24 right-6';
      case 'top-left': return 'top-24 left-6 sm:left-24';
      case 'center-right': return 'top-1/2 -translate-y-1/2 right-6';
      case 'center-left': return 'top-1/2 -translate-y-1/2 left-6 sm:left-24';
      case 'center': return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
      default: return 'bottom-6 right-6';
    }
  };
  
  // Get icon for current step (special icons for taskmodal section)
  const getStepIcon = () => {
    if (currentSection.id === 'taskmodal') {
      if (currentStepIndex === 0) return <FileText className="w-5 h-5" />;
      if (currentStepIndex === 1) return <Flag className="w-5 h-5" />;
      if (currentStepIndex === 2) return <ListChecks className="w-5 h-5" />;
    }
    return currentSection.icon;
  };
  
  const isLastStep = currentSectionIndex === allTourSections.length - 1 && currentStepIndex === currentSection.steps.length - 1;
  const isFirstStep = currentSectionIndex === 0 && currentStepIndex === 0;
  
  // Reactive dark mode detection - updates instantly when theme changes
  const isDark = state.preferences.theme === 'dark' || 
    (state.preferences.theme === 'system' && typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  const content = (
    <div className="fixed inset-0 z-[999999999] pointer-events-none" data-onboarding-modal="true">
      {/* Subtle vignette overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
           style={{ 
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.15) 100%)'
        }}
      />
      
      {/* Language Selection Modal */}
      {!language && (
        <LanguageSelectionModal
          isDark={isDark}
          accentColor={accentColor}
          onSelect={handleLanguageSelect}
          onSkip={handleSkip}
        />
      )}

      {/* Final Congratulations Modal */}
      {language && currentSection?.id === 'complete' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
          <div 
            className="absolute inset-0 bg-black/20"
            onClick={handleComplete}
          />
          <div 
            className={`relative w-full max-w-sm mx-4 rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 ${
              isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
            }`}
             style={{
              background: isDark 
                ? 'linear-gradient(135deg, rgba(30,41,59,0.98) 0%, rgba(15,23,42,0.98) 100%)'
                : 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(250,250,252,0.98) 100%)',
              border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.8)',
              animation: !isAnimating ? 'float-in 0.5s ease-out' : undefined
            }}
          >
            {/* Fox with celebration animation */}
            <div className="flex justify-center pt-8 pb-4">
              <div className="relative">
                <img 
                  src={getFoxImagePath()}
                alt="TaskFuchs" 
                  className="w-[164px] h-[164px] object-contain"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    if (img.src.includes('/3d_fox.png')) img.src = './3d_fox.png';
                  }}
                  style={{ animation: 'bounce-gentle 1.5s ease-in-out infinite' }}
                />
                <Sparkles 
                  className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400"
                  style={{ animation: 'pulse 1s ease-in-out infinite' }}
                />
                <Sparkles 
                  className="absolute -bottom-1 -left-3 w-5 h-5 text-yellow-500"
                  style={{ animation: 'pulse 1.2s ease-in-out infinite 0.3s' }}
              />
            </div>
          </div>
          
            {/* Content */}
            <div className="text-center px-6 pb-4">
              <h1 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {t(currentStep?.title)}
              </h1>
              <p className={`text-base mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                {t(currentStep?.text)}
              </p>
              
              {/* Fox Slogan */}
              <div 
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
                style={{ backgroundColor: `${accentColor}20` }}
              >
                <span className="text-lg" style={{ color: accentColor }}>
                  {t(currentStep?.foxMessage)}
                </span>
              </div>
          </div>
          
            {/* Checkbox */}
            <div className="px-6 pb-4">
              <label className={`flex items-center justify-center gap-2 cursor-pointer ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                  style={{ accentColor }}
                />
                <span className="text-sm">
                  {language === 'de' ? 'Onboarding nicht mehr anzeigen' : 'Don\'t show onboarding again'}
                </span>
              </label>
          </div>

            {/* Button */}
            <div className="px-6 pb-6">
            <button
                onClick={handleComplete}
                className="w-full py-3 px-4 rounded-xl font-bold text-white text-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                style={{ backgroundColor: accentColor }}
              >
                <Check className="w-5 h-5" />
                <span>{language === 'de' ? 'Los geht\'s!' : 'Let\'s go!'}</span>
            </button>
          </div>
        </div>
        </div>
      )}

      {/* Tour Tooltip */}
      {language && currentStep && currentSection?.id !== 'complete' && (
    <div 
          className={`absolute ${getPositionClasses(currentStep.position, showTaskModal)} pointer-events-auto transition-all duration-300 ease-out ${
            isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
          }`}
      style={{ 
            maxWidth: '380px',
            animation: !isAnimating ? 'float-in 0.4s ease-out' : undefined
          }}
        >
          <style>{`
            @keyframes float-in {
              0% { opacity: 0; transform: translateY(10px) scale(0.97); }
              100% { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes pulse-ring {
              0% { transform: scale(1); opacity: 0.8; }
              50% { transform: scale(1.05); opacity: 0.4; }
              100% { transform: scale(1); opacity: 0.8; }
            }
          `}</style>
          
          <div 
            className="rounded-2xl overflow-hidden shadow-2xl"
        style={{
              background: isDark 
                ? 'linear-gradient(135deg, rgba(30,41,59,0.97) 0%, rgba(15,23,42,0.97) 100%)'
                : 'linear-gradient(135deg, rgba(255,255,255,0.97) 0%, rgba(250,250,252,0.97) 100%)',
              backdropFilter: 'blur(20px)',
              border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(200,200,200,0.3)',
              boxShadow: isDark
                ? '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05)'
                : '0 25px 50px -12px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255,255,255,0.8)'
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b"
              style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
            >
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  {allTourSections.map((section, idx) => (
                    <div
                      key={section.id}
                      className="w-6 h-1.5 rounded-full transition-all duration-300"
            style={{
                        backgroundColor: idx <= currentSectionIndex ? accentColor : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'),
                        opacity: idx === currentSectionIndex ? 1 : 0.5
                      }}
                    />
                  ))}
                </div>
              </div>
              
              <button
                onClick={handleSkip}
                className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                  isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                {language === 'de' ? 'Schließen' : 'Close'}
          </button>
        </div>
        
            {/* Content */}
            <div className="px-5 py-4">
              <div className="flex items-start gap-3 mb-3">
                <div 
                  className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg"
                  style={{ backgroundColor: accentColor, animation: 'pulse-ring 2s ease-in-out infinite' }}
                >
                  {getStepIcon()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-bold text-base leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {t(currentStep.title)}
                  </h3>
                  <p className={`text-sm mt-1.5 leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    {t(currentStep.text)}
                        </p>
                      </div>
                    </div>
                    
              {/* Fox Message - with image instead of emoji */}
              {currentStep.foxMessage && (
                <div 
                  className="flex items-center gap-3 p-3 rounded-xl mt-3"
                  style={{ backgroundColor: `${accentColor}15` }}
                >
                  <img 
                    src={getFoxImagePath()}
                    alt="" 
                    className="w-12 h-12 object-contain flex-shrink-0"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      if (img.src.includes('/3d_fox.png')) img.src = './3d_fox.png';
                    }}
                  />
                  <p className="text-sm font-medium" style={{ color: accentColor }}>
                    {t(currentStep.foxMessage)}
                  </p>
                </div>
              )}
              
              {/* Task Modal hint */}
              {currentStep.openTaskModal && (
                <div className={`flex items-center gap-2 mt-3 p-2.5 rounded-lg ${isDark ? 'bg-gray-800/50' : 'bg-gray-100/50'}`}>
                  <FileText className="w-4 h-4 flex-shrink-0" style={{ color: accentColor }} />
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {language === 'de' ? 'Die Beispielaufgabe zeigt alle Details.' : 'The sample task shows all details.'}
                        </p>
                      </div>
              )}
              
              {/* Sidebar hint for relevant sections */}
              {(currentSection.id === 'tasks' || currentSection.id === 'projects' || currentSection.id === 'pins') && currentStepIndex === 0 && (
                <div className={`flex items-center gap-2 mt-3 p-2.5 rounded-lg ${isDark ? 'bg-gray-800/50' : 'bg-gray-100/50'}`}>
                  <PanelLeftOpen className="w-4 h-4 flex-shrink-0" style={{ color: accentColor }} />
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {language === 'de' ? 'Tipp: Die Sidebar lässt sich ein- und ausklappen.' : 'Tip: The sidebar can be expanded and collapsed.'}
                  </p>
                        </div>
                      )}
              
              {/* Styling Preview - shows current settings during styling demo */}
              {currentStep.stylingDemo && (currentStep.applyStyling || currentStep.restoreOriginalStyling) && (
                <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                  <div className="flex items-center justify-between gap-4">
                    {/* Theme indicator */}
                    <div className="flex flex-col items-center gap-1">
                      <div 
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          isDark ? 'bg-gray-800' : 'bg-gray-100'
                        }`}
                      >
                        {isDark ? (
                          <Moon className="w-5 h-5 text-blue-400" />
                        ) : (
                          <Sun className="w-5 h-5 text-yellow-500" />
                        )}
                            </div>
                      <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {isDark ? 'Dark' : 'Light'}
                      </span>
                        </div>
                    
                    {/* Background preview */}
                    <div className="flex flex-col items-center gap-1">
                      <div 
                        className="w-10 h-10 rounded-xl border-2 overflow-hidden"
                        style={{ borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }}
                      >
                        {state.preferences.backgroundImage ? (
                          <img 
                            src={state.preferences.backgroundImage.startsWith('/') 
                              ? state.preferences.backgroundImage 
                              : `/backgrounds/${state.preferences.backgroundImage}`}
                            alt="BG"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const img = e.target as HTMLImageElement;
                              img.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className={`w-full h-full ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`} />
                        )}
                      </div>
                      <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {language === 'de' ? 'Hinter.' : 'BG'}
                      </span>
                    </div>
                    
                    {/* Accent color */}
                    <div className="flex flex-col items-center gap-1">
                      <div 
                        className="w-10 h-10 rounded-xl shadow-lg"
                          style={{
                          backgroundColor: accentColor,
                          boxShadow: `0 4px 12px ${accentColor}50`
                        }}
                      />
                      <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {language === 'de' ? 'Farbe' : 'Color'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
                    </div>
                    
            {/* Footer */}
            <div className="px-5 py-3 border-t"
                          style={{
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)'
              }}
            >
              {/* Checkbox on last step */}
              {isLastStep && (
                <label className={`flex items-center gap-2 mb-3 cursor-pointer ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  <input
                    type="checkbox"
                    checked={dontShowAgain}
                    onChange={(e) => setDontShowAgain(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                    style={{ accentColor }}
                  />
                  <span className="text-sm">
                    {language === 'de' ? 'Onboarding nicht mehr anzeigen' : 'Don\'t show onboarding again'}
                          </span>
                </label>
              )}
              
                      <div className="flex items-center justify-between">
                        <button
                  onClick={handlePrev}
                  disabled={isFirstStep}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isFirstStep ? 'opacity-30 cursor-not-allowed' : isDark ? 'text-gray-300 hover:bg-gray-700/50' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                        </button>
                        
                <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {currentTotalStep} / {totalSteps}
                </span>
                
                {isLastStep ? (
                  <button
                    onClick={handleComplete}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{ backgroundColor: accentColor }}
                  >
                    <Check className="w-4 h-4" />
                    <span>{language === 'de' ? 'Fertig' : 'Done'}</span>
                  </button>
                ) : (
                        <button
                    onClick={handleNext}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{ backgroundColor: accentColor }}
                  >
                    <span>{language === 'de' ? 'Weiter' : 'Next'}</span>
                    <ChevronRight className="w-4 h-4" />
                        </button>
                )}
              </div>
                        </div>
                        </div>
                      </div>
                    )}
      
      {/* Guide Cursor Animation */}
      {showGuideCursor && guideCursorTarget && (
        <GuideCursor
          targetSelector={guideCursorTarget}
          accentColor={accentColor}
          onAnimationComplete={handleGuideCursorComplete}
          delay={100}
          showClick={currentStep?.guideCursorClickAnimation ?? true}
          holdDuration={300}
        />
                    )}
                  </div>
  );
  
  return createPortal(content, document.body);
}

// Splash Modal Component - shows for 5 seconds on app start
interface SplashModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartOnboarding: () => void;
  showOnboardingOption: boolean;
}

export function SplashModal({ isOpen, onClose, onStartOnboarding, showOnboardingOption }: SplashModalProps) {
  const { state } = useApp();
  const accentColor = state.preferences.accentColor;
  
  // Reactive dark mode detection - updates instantly when theme changes
  const isDark = state.preferences.theme === 'dark' || 
    (state.preferences.theme === 'system' && typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  // Auto-close after 5 seconds for returning users (no onboarding)
  useEffect(() => {
    if (!isOpen || showOnboardingOption) return;
    
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [isOpen, onClose, showOnboardingOption]);
  
  // ESC key handler
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  const content = (
    <div className="fixed inset-0 z-[999998] flex items-center justify-center pointer-events-auto">
      <div 
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
      />
      <div 
        className="relative w-full max-w-xs mx-4 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 fade-in duration-500"
        style={{
          background: isDark 
            ? 'linear-gradient(135deg, rgba(30,41,59,0.98) 0%, rgba(15,23,42,0.98) 100%)'
            : 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(250,250,252,0.98) 100%)',
          border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.8)',
        }}
      >
        {/* Fox with animation */}
        <div className="flex justify-center pt-6 pb-3">
          <img 
            src={getFoxImagePath()}
            alt="TaskFuchs" 
            className="w-[136px] h-[136px] object-contain"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              if (img.src.includes('/3d_fox.png')) img.src = './3d_fox.png';
            }}
            style={{ animation: 'bounce-gentle 2s ease-in-out infinite' }}
          />
        </div>
        
        {/* Title */}
        <div className="text-center px-6 pb-4">
          <h1 className={`text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            TaskFuchs
          </h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {showOnboardingOption ? 'Bereit für die Einführung?' : 'Willkommen zurück!'}
          </p>
             </div>
        
        {/* Actions */}
        <div className="px-6 pb-6">
          {showOnboardingOption ? (
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className={`flex-1 py-2.5 px-3 rounded-xl font-medium text-sm transition-all ${
                  isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Überspringen
              </button>
              <button
                onClick={onStartOnboarding}
                className="flex-1 py-2.5 px-3 rounded-xl font-semibold text-white text-sm transition-all hover:scale-[1.02]"
                style={{ backgroundColor: accentColor }}
              >
                Einführung
              </button>
           </div>
          ) : (
            <p className={`text-center text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Klicken oder ESC zum Schließen
            </p>
          )}
        </div>
      </div>
    </div>
  );
  
  return createPortal(content, document.body);
} 
