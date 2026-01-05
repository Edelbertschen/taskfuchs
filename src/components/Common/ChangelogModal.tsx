import React from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Zap, Bug, Wrench, Gift } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from 'react-i18next';

interface ChangelogEntry {
  date: string;
  items: {
    type: 'feature' | 'fix' | 'improvement';
    text: {
      de: string;
      en: string;
    };
  }[];
}

// Changelog data - add new entries at the top
const CHANGELOG: ChangelogEntry[] = [
  {
    date: '2025-12-30',
    items: [
      {
        type: 'feature',
        text: {
          de: 'Mobile Companion App – Installiere TaskFuchs als native App auf iOS, Android und Desktop',
          en: 'Mobile Companion App – Install TaskFuchs as native app on iOS, Android and Desktop'
        }
      },
      {
        type: 'improvement',
        text: {
          de: 'Aggressive Cache-Invalidierung für Mobile – Updates werden jetzt nach 5 Minuten statt 1 Stunde aktualisiert',
          en: 'Aggressive cache invalidation for mobile – Updates now refresh after 5 minutes instead of 1 hour'
        }
      },
      {
        type: 'fix',
        text: {
          de: 'Zombie-Tasks in der Mobilversion vollständig behoben – Zeitfenster von 2 Min auf 30 Sekunden reduziert',
          en: 'Zombie tasks in mobile version completely fixed – Time window reduced from 2 min to 30 seconds'
        }
      },
      {
        type: 'fix',
        text: {
          de: 'LocalStorage-Bereinigung nach Server-Sync – Verhindert dass gelöschte Tasks wieder erscheinen',
          en: 'LocalStorage cleanup after server sync – Prevents deleted tasks from reappearing'
        }
      },
      {
        type: 'fix',
        text: {
          de: 'Z-Index Problem bei Multiselect in Inbox behoben – Zuweisen-Dropdown jetzt über Task-Cards',
          en: 'Z-Index issue with multiselect in Inbox fixed – Assign dropdown now above task cards'
        }
      }
    ]
  },
  {
    date: '2025-12-18',
    items: [
      {
        type: 'feature',
        text: {
          de: 'Changelog-Modal "Was gibt es Neues?" im Nutzermenü',
          en: 'Changelog modal "What\'s New?" in user menu'
        }
      },
      {
        type: 'improvement',
        text: {
          de: 'Einspalten-Ansicht in Planer, Pins und Projekten ist jetzt breiter (600px)',
          en: 'Single-column view in Planner, Pins and Projects is now wider (600px)'
        }
      }
    ]
  },
  {
    date: '2025-12-17',
    items: [
      {
        type: 'feature',
        text: {
          de: 'KI-Aufgabenerfassung – Beschreibe deine Aufgaben in natürlicher Sprache und die KI erkennt automatisch Datum, Priorität, Dauer und Projekt',
          en: 'AI Task Capture – Describe your tasks in natural language and AI automatically detects date, priority, duration and project'
        }
      },
      {
        type: 'improvement',
        text: {
          de: 'KI-Einstellungen für Admins unter Admin → KI-Einstellungen',
          en: 'AI settings for admins under Admin → AI Settings'
        }
      },
      {
        type: 'improvement',
        text: {
          de: 'Smart-Aufgabe-Dialog: Verbessertes Design, Auto-Resize für längere Eingaben',
          en: 'Smart Task Dialog: Improved design, auto-resize for longer inputs'
        }
      },
      {
        type: 'fix',
        text: {
          de: 'Gelöschte Aufgaben bleiben nicht mehr in der Mobilversion hängen',
          en: 'Deleted tasks no longer persist in the mobile version'
        }
      }
    ]
  },
  {
    date: '2025-12-11',
    items: [
      {
        type: 'fix',
        text: {
          de: 'Kritischer Bugfix: Aufgaben werden jetzt zuverlässig gespeichert',
          en: 'Critical bugfix: Tasks are now saved reliably'
        }
      },
      {
        type: 'fix',
        text: {
          de: 'Kontextmenü und Checkbox funktionieren jetzt bei laufendem Timer',
          en: 'Context menu and checkbox now work while timer is running'
        }
      },
      {
        type: 'improvement',
        text: {
          de: 'Lokale Aufgaben werden beim Start mit Server zusammengeführt',
          en: 'Local tasks are merged with server on startup'
        }
      }
    ]
  },
  {
    date: '2025-12-10',
    items: [
      {
        type: 'feature',
        text: {
          de: 'Multi-Task-Eingabe: Mehrere Aufgaben auf einmal erstellen (eine pro Zeile)',
          en: 'Multi-task input: Create multiple tasks at once (one per line)'
        }
      },
      {
        type: 'improvement',
        text: {
          de: 'Pins-Layout und Projektansicht verbessert',
          en: 'Pins layout and project view improved'
        }
      },
      {
        type: 'improvement',
        text: {
          de: 'Tagesabschluss zeigt nun alle Statistiken korrekt an',
          en: 'End of day now shows all statistics correctly'
        }
      }
    ]
  },
  {
    date: '2025-12-09',
    items: [
      {
        type: 'feature',
        text: {
          de: 'Neue Themes: Petrol (Standard) und Fox',
          en: 'New themes: Petrol (default) and Fox'
        }
      },
      {
        type: 'feature',
        text: {
          de: 'E-Mail-Vorschau Modal mit Anhängen',
          en: 'Email preview modal with attachments'
        }
      },
      {
        type: 'improvement',
        text: {
          de: 'Sortierbare Admin-Tabelle mit Nutzeraktivität',
          en: 'Sortable admin table with user activity'
        }
      }
    ]
  },
  {
    date: '2025-12-05',
    items: [
      {
        type: 'feature',
        text: {
          de: 'Outlook E-Mail Integration mit Drag & Drop',
          en: 'Outlook email integration with drag & drop'
        }
      },
      {
        type: 'improvement',
        text: {
          de: 'E-Mails können auf Datumsspalten gezogen werden',
          en: 'Emails can be dragged onto date columns'
        }
      },
      {
        type: 'fix',
        text: {
          de: 'Mobile Ansicht: Weißer Bildschirm behoben',
          en: 'Mobile view: White screen fixed'
        }
      }
    ]
  },
  {
    date: '2025-12-04',
    items: [
      {
        type: 'feature',
        text: {
          de: 'Projekt-Spalten und verbesserte Heute-Filter',
          en: 'Project columns and improved Today filters'
        }
      },
      {
        type: 'improvement',
        text: {
          de: 'Einheitliche Filter-Panels in Planer, Pins und Projekten',
          en: 'Unified filter panels across Planner, Pins and Projects'
        }
      },
      {
        type: 'improvement',
        text: {
          de: 'Aktive Filter werden automatisch auf neue Aufgaben angewendet',
          en: 'Active filters are automatically applied to new tasks'
        }
      }
    ]
  }
];

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangelogModal({ isOpen, onClose }: ChangelogModalProps) {
  const { state } = useApp();
  const { i18n } = useTranslation();
  
  const accentColor = state.preferences?.accentColor || '#0ea5e9';
  const isDark = document.documentElement.classList.contains('dark');
  const isGerman = i18n.language === 'de';

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const locale = isGerman ? 'de-DE' : 'en-US';
    return date.toLocaleDateString(locale, { 
      weekday: 'long',
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    });
  };

  const getIcon = (type: 'feature' | 'fix' | 'improvement') => {
    switch (type) {
      case 'feature':
        return <Gift className="w-4 h-4" />;
      case 'fix':
        return <Bug className="w-4 h-4" />;
      case 'improvement':
        return <Wrench className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: 'feature' | 'fix' | 'improvement') => {
    switch (type) {
      case 'feature':
        return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' };
      case 'fix':
        return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' };
      case 'improvement':
        return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' };
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        style={{
          background: isDark 
            ? 'linear-gradient(135deg, rgba(30,41,59,0.98) 0%, rgba(15,23,42,0.98) 100%)'
            : 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(250,250,252,0.98) 100%)',
          border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${accentColor}20` }}
            >
              <Sparkles className="w-5 h-5" style={{ color: accentColor }} />
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {isGerman ? 'Was gibt es Neues?' : "What's New?"}
              </h2>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {isGerman ? 'Aktuelle Änderungen und Verbesserungen' : 'Recent changes and improvements'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-black/5 text-gray-500'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {CHANGELOG.map((entry, index) => (
            <div key={entry.date}>
              {/* Date Header */}
              <div className="flex items-center gap-3 mb-3">
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: accentColor }}
                />
                <h3 className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                  {formatDate(entry.date)}
                </h3>
                {index === 0 && (
                  <span 
                    className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: accentColor }}
                  >
                    {isGerman ? 'Neu' : 'Latest'}
                  </span>
                )}
              </div>

              {/* Items */}
              <div className="space-y-2 ml-5">
                {entry.items.map((item, itemIndex) => {
                  const colors = getTypeColor(item.type);
                  return (
                    <div 
                      key={itemIndex}
                      className={`flex items-start gap-3 p-3 rounded-lg ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}`}
                    >
                      <div className={`p-1.5 rounded-lg ${colors.bg} ${colors.text}`}>
                        {getIcon(item.type)}
                      </div>
                      <p className={`text-sm flex-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {isGerman ? item.text.de : item.text.en}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl text-white font-medium transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ backgroundColor: accentColor }}
          >
            {isGerman ? 'Schließen' : 'Close'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ChangelogModal;

