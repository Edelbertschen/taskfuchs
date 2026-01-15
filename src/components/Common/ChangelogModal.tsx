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
    date: '2026-01-15',
    items: [
      {
        type: 'fix',
        text: {
          de: 'Perfekter Hover-Effekt – Aufgabenkarten bekommen beim Überfahren ein elegantes, sichtbares Farboverlay in der Akzentfarbe. Text springt nicht mehr, alles bleibt an seinem Platz. Super clean und edel! ✨',
          en: 'Perfect hover effect – Task cards get an elegant, visible color overlay in the accent color on hover. Text no longer jumps, everything stays in place. Super clean and elegant! ✨'
        }
      },
      {
        type: 'fix',
        text: {
          de: 'DnD in Heute funktioniert jetzt – Aufgaben können in der Heute-Ansicht problemlos per Drag & Drop sortiert werden. Karten bleiben beim Ziehen sichtbar!',
          en: 'DnD in Today works now – Tasks can be easily sorted in Today view via drag & drop. Cards remain visible while dragging!'
        }
      },
      {
        type: 'fix',
        text: {
          de: 'DnD-Versatz in Pins endgültig behoben – Aufgabenkarten springen beim Ziehen nicht mehr nach rechts. Funktioniert jetzt genauso perfekt wie in Planer und Projekte! 🎯',
          en: 'DnD offset in Pins finally fixed – Task cards no longer jump to the right when dragging. Now works just as perfectly as in Planner and Projects! 🎯'
        }
      },
      {
        type: 'fix',
        text: {
          de: 'Erledigte Aufgaben in Pins – Filter für erledigte Aufgaben funktioniert jetzt auch in der Pins-Ansicht',
          en: 'Completed tasks in Pins – Filter for completed tasks now works in Pins view as well'
        }
      },
      {
        type: 'fix',
        text: {
          de: 'Archivieren aus Planer – Aufgaben können nun zuverlässig aus allen Planer-Spalten archiviert werden',
          en: 'Archive from Planner – Tasks can now be reliably archived from all Planner columns'
        }
      },
      {
        type: 'fix',
        text: {
          de: 'Überfällige Aufgaben in Heute – Vergangene Aufgaben erscheinen nun garantiert in der Heute-Spalte',
          en: 'Overdue tasks in Today – Past tasks now guaranteed to appear in the Today column'
        }
      }
    ]
  },
  {
    date: '2026-01-14',
    items: [
      {
        type: 'improvement',
        text: {
          de: 'Animierte View-Übergänge – Flüssige Slide-Animationen beim Wechseln zwischen Ansichten',
          en: 'Animated view transitions – Smooth slide animations when switching between views'
        }
      },
      {
        type: 'improvement',
        text: {
          de: 'Skeleton Loading States – Elegante Platzhalter-Animationen beim Laden von Ansichten statt langweiliger Spinner',
          en: 'Skeleton loading states – Elegant placeholder animations when loading views instead of boring spinners'
        }
      },
      {
        type: 'improvement',
        text: {
          de: 'Befriedigende Checkbox-Animation – Beim Abhaken einer Aufgabe erscheint jetzt ein eleganter Pop-Effekt mit Glow und ein Häkchen, das sanft einfliegt',
          en: 'Satisfying checkbox animation – Completing a task now shows an elegant pop effect with glow and a smoothly flying checkmark'
        }
      },
      {
        type: 'improvement',
        text: {
          de: 'Lebendige Hover-Effekte – Aufgabenkarten schweben beim Überfahren leicht an, mit sanftem Schatten und dezenter Akzentfarben-Umrandung',
          en: 'Lively hover effects – Task cards gently lift when hovered, with soft shadow and subtle accent color border'
        }
      },
      {
        type: 'improvement',
        text: {
          de: 'Einblend-Animation – Neue Aufgaben gleiten sanft von oben ein mit dezenter Glow-Animation',
          en: 'Slide-in animation – New tasks smoothly slide in from above with subtle glow effect'
        }
      },
      {
        type: 'improvement',
        text: {
          de: 'Verbessertes Drag & Drop – Aufgaben schweben beim Ziehen mit Rotation, Zielspalten leuchten dezent auf',
          en: 'Enhanced Drag & Drop – Tasks float with rotation while dragging, target columns glow subtly'
        }
      },
      {
        type: 'fix',
        text: {
          de: 'Projekt löschen funktioniert – Eingabe von "LÖSCHEN" wird nicht mehr bei laufendem Timer zurückgesetzt',
          en: 'Delete project works – Typing "DELETE" no longer resets when timer is running'
        }
      }
    ]
  },
  {
    date: '2026-01-13',
    items: [
      {
        type: 'feature',
        text: {
          de: 'Datum entfernen – Neue Option "Kein Datum" im Kontextmenü zum Entfernen des Datums einer Aufgabe',
          en: 'Remove date – New "No date" option in context menu to remove a task\'s date'
        }
      },
      {
        type: 'improvement',
        text: {
          de: 'Überfällige Aufgaben markiert – Aufgaben mit vergangenem Datum zeigen das Datum rot auf der Karte, auch in Datumsspalten',
          en: 'Overdue tasks marked – Tasks with past dates show the date in red on the card, even in date columns'
        }
      },
      {
        type: 'fix',
        text: {
          de: 'Überfällige Aufgaben zuverlässig in Heute – Alle Aufgaben mit vergangenen Daten erscheinen jetzt garantiert in der Heute-Spalte',
          en: 'Overdue tasks reliably in Today – All tasks with past dates now guaranteed to appear in the Today column'
        }
      }
    ]
  },
  {
    date: '2026-01-09',
    items: [
      {
        type: 'feature',
        text: {
          de: 'Projektfarben – Weise Projekten Farben zu für schnelle visuelle Erkennung auf Aufgabenkarten. Farbauswahl direkt in der Projekt-Sidebar per Klick auf den Farbkreis.',
          en: 'Project colors – Assign colors to projects for quick visual identification on task cards. Color selection directly in project sidebar by clicking the color circle.'
        }
      },
      {
        type: 'feature',
        text: {
          de: 'Kontextmenü für Projekte – Rechtsklick auf Projekte in der Sidebar für schnellen Zugriff auf Umbenennen, Farbe, Spalten und Löschen',
          en: 'Context menu for projects – Right-click projects in sidebar for quick access to rename, color, columns and delete'
        }
      },
      {
        type: 'feature',
        text: {
          de: 'Projektname bei Hover – Der Projektname erscheint dezent beim Überfahren der Aufgabenkarte',
          en: 'Project name on hover – Project name appears subtly when hovering over task card'
        }
      },
      {
        type: 'improvement',
        text: {
          de: 'Elegante Timer-Animation – Laufende Timer werden mit einer sanft rotierenden Lichtlinie um die Karte angezeigt',
          en: 'Elegant timer animation – Active timers shown with a smoothly rotating light line around the card'
        }
      },
      {
        type: 'improvement',
        text: {
          de: 'Vergangene Aufgaben automatisch in Heute – Aufgaben mit vergangenen Daten erscheinen automatisch in der Heute-Spalte',
          en: 'Past tasks automatically in Today – Tasks with past dates automatically appear in the Today column'
        }
      },
      {
        type: 'fix',
        text: {
          de: 'Darkmode-Fixes – Badges und Tags jetzt korrekt im Darkmode dargestellt',
          en: 'Darkmode fixes – Badges and tags now correctly displayed in dark mode'
        }
      },
      {
        type: 'improvement',
        text: {
          de: 'Aufgeräumte Zeiteingabe – Spinner-Buttons bei Minuteneingabe entfernt für cleanes Design',
          en: 'Cleaner time input – Spinner buttons removed from minute input for clean design'
        }
      },
      {
        type: 'improvement',
        text: {
          de: 'Aufgeräumter Projekt-Header – Info-Button für Notiz-Verknüpfung entfernt',
          en: 'Cleaner project header – Info button for note linking removed'
        }
      },
      {
        type: 'improvement',
        text: {
          de: 'Kapazitätsplanung entfernt – Vereinfachte Oberfläche ohne Timebudget-Funktionen',
          en: 'Capacity planning removed – Simplified interface without timebudget features'
        }
      }
    ]
  },
  {
    date: '2026-01-08',
    items: [
      {
        type: 'feature',
        text: {
          de: 'Intuitive Filterleiste – Toggle-Verhalten (Klick aktiviert/deaktiviert), klarer Reset-Button, Tooltips, Tags direkt sichtbar',
          en: 'Intuitive filter bar – Toggle behavior (click to activate/deactivate), clear reset button, tooltips, tags directly visible'
        }
      },
      {
        type: 'feature',
        text: {
          de: 'Gepinnte Aufgaben ausblenden – Neuer Filter in Projekte und Planer zum Ausblenden gepinnter Aufgaben',
          en: 'Hide pinned tasks – New filter in Projects and Planner to hide pinned tasks'
        }
      },
      {
        type: 'fix',
        text: {
          de: 'Scrollen in Projektspalten bei aktiver Filterleiste repariert – Flexbox-Layout mit min-h-0 korrigiert',
          en: 'Fixed scrolling in project columns with active filter bar – Flexbox layout corrected with min-h-0'
        }
      },
      {
        type: 'improvement',
        text: {
          de: 'Prioritäten-Filter ausgeschrieben – Hoch, Mittel, Niedrig, Keine statt H, M, L, –',
          en: 'Priority filters spelled out – High, Medium, Low, None instead of H, M, L, –'
        }
      },
      {
        type: 'feature',
        text: {
          de: 'Neue Zeitraum-Filter für Pins und Projekte – Jederzeit (nur ohne Datum), Heute, Morgen, Diese Woche',
          en: 'New date filters for Pins and Projects – Anytime (no date only), Today, Tomorrow, This Week'
        }
      },
      {
        type: 'improvement',
        text: {
          de: 'Datum immer sichtbar auf Aufgabenkarten – Zeigt Deadline, Fälligkeit oder Erinnerungsdatum, vergangene Daten in Rot',
          en: 'Date always visible on task cards – Shows deadline, due date or reminder date, past dates in red'
        }
      },
      {
        type: 'fix',
        text: {
          de: 'Scrollen in Projektspalten bei aktiven Filtern repariert – Flexbox-Höhenberechnung korrigiert',
          en: 'Fixed scrolling in project columns with active filters – Flexbox height calculation corrected'
        }
      },
      {
        type: 'fix',
        text: {
          de: 'Spaltenbreiten bei Projekten repariert – Gleichmäßige Verteilung nach DnD-Update wiederhergestellt',
          en: 'Fixed column widths in projects – Even distribution restored after DnD update'
        }
      },
      {
        type: 'improvement',
        text: {
          de: 'Markdown-Überschriften in Notizen deutlich größer – H1 bis H6 jetzt klar vom Fließtext unterscheidbar',
          en: 'Markdown headings in notes significantly larger – H1 to H6 now clearly distinguishable from body text'
        }
      },
      {
        type: 'improvement',
        text: {
          de: 'Inbox: Elegantes Projekt-Submenu im Kontextmenü – Gleicher Style wie bei Projekten und Pins',
          en: 'Inbox: Elegant project submenu in context menu – Same style as in Projects and Pins'
        }
      }
    ]
  },
  {
    date: '2026-01-07',
    items: [
      {
        type: 'feature',
        text: {
          de: 'Projektspalten per Drag & Drop sortieren – Kanban-Spalten via Drag-Handle neu anordnen',
          en: 'Project columns drag & drop sorting – Reorder Kanban columns via drag handle'
        }
      },
      {
        type: 'feature',
        text: {
          de: 'Projekte per Drag & Drop sortieren – Projekte in der Sidebar via Drag-Handle neu anordnen',
          en: 'Projects drag & drop sorting – Reorder projects in sidebar via drag handle'
        }
      },
      {
        type: 'feature',
        text: {
          de: 'Dynamische Begrüßung je nach Tageszeit – Guten Morgen, Tag, Abend oder Nacht mit passenden Motivationssprüchen',
          en: 'Dynamic greeting based on time of day – Good morning, afternoon, evening or night with matching motivational messages'
        }
      },
      {
        type: 'improvement',
        text: {
          de: 'Performance: Debug-Logs werden in Production-Builds automatisch entfernt',
          en: 'Performance: Debug logs are automatically removed in production builds'
        }
      },
      {
        type: 'feature',
        text: {
          de: 'Neue EmptyState-Komponente – Schönere leere Zustände mit Animationen und visuellen Akzenten',
          en: 'New EmptyState component – Beautiful empty states with animations and visual accents'
        }
      },
      {
        type: 'feature',
        text: {
          de: 'Skeleton-Komponenten – Loading-Placeholders für Tasks, Projekte und Statistiken',
          en: 'Skeleton components – Loading placeholders for tasks, projects and statistics'
        }
      },
      {
        type: 'improvement',
        text: {
          de: 'Aufgaben duplizieren: Präfix "Kopie von" statt Suffix "(Kopie)" für bessere Lesbarkeit',
          en: 'Task duplication: Prefix "Copy of" instead of suffix "(Copy)" for better readability'
        }
      },
      {
        type: 'feature',
        text: {
          de: 'Kontextmenü: Projekt-Zuweisung – Rechtsklick auf Aufgaben ermöglicht direkte Zuweisung zu Projekten und Spalten',
          en: 'Context menu: Project assignment – Right-click on tasks allows direct assignment to projects and columns'
        }
      },
      {
        type: 'improvement',
        text: {
          de: 'Projekt-Zuweisung verbessert – Klare Spaltenauswahl statt verwirrender "Hauptspalte"',
          en: 'Project assignment improved – Clear column selection instead of confusing "Main column"'
        }
      },
      {
        type: 'improvement',
        text: {
          de: 'Aufgabenbeschreibungen: Elegantes Markdown-Rendering mit klarer Überschriften-Hierarchie',
          en: 'Task descriptions: Elegant markdown rendering with clear heading hierarchy'
        }
      },
      {
        type: 'improvement',
        text: {
          de: 'Mobile: Abbrechen-Button beim Erstellen von Aufgaben hinzugefügt',
          en: 'Mobile: Cancel button added when creating tasks'
        }
      }
    ]
  },
  {
    date: '2026-01-05',
    items: [
      {
        type: 'fix',
        text: {
          de: 'ZOMBIE-TASKS ENDGÜLTIG BEHOBEN – LocalStorage wird VOR Server-Sync gelöscht, Server ist einzige Wahrheit',
          en: 'ZOMBIE TASKS FINALLY FIXED – LocalStorage cleared before server sync, server is single source of truth'
        }
      },
      {
        type: 'feature',
        text: {
          de: 'Projekte: "Jederzeit" Filter – Blendet geplante Aufgaben aus, zeigt nur heutige und ungeplante Aufgaben (Things3-Style)',
          en: 'Projects: "Anytime" filter – Hides scheduled tasks, shows only today\'s and unscheduled tasks (Things3-style)'
        }
      },
      {
        type: 'improvement',
        text: {
          de: 'Einheitlicher Prioritäten-Filter in Planer, Pins und Projekten – Single-Selection mit ALL/H/M/L/– Buttons',
          en: 'Unified priority filter in Planner, Pins and Projects – Single-selection with ALL/H/M/L/– buttons'
        }
      },
      {
        type: 'improvement',
        text: {
          de: 'Mobile: Visuelle Rückmeldung beim Erledigen – Success-Animation mit Häkchen und automatischem Schließen',
          en: 'Mobile: Visual feedback when completing – Success animation with checkmark and auto-close'
        }
      },
      {
        type: 'improvement',
        text: {
          de: 'Mobile: Header-Buttons einheitlich zentriert und mit Touch-Feedback',
          en: 'Mobile: Header buttons uniformly centered with touch feedback'
        }
      }
    ]
  },
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
        type: 'feature',
        text: {
          de: 'Mobile: Long-Press Kontext-Menü – Priorität ändern, auf Morgen verschieben, zu Pins hinzufügen, Focus-Modus',
          en: 'Mobile: Long-press context menu – Change priority, move to tomorrow, add to pins, focus mode'
        }
      },
      {
        type: 'feature',
        text: {
          de: 'Mobile: Focus-Modus – Vollbild-Ansicht mit 25-Min Pomodoro-Timer und Subtask-Checkliste',
          en: 'Mobile: Focus mode – Full-screen view with 25-min Pomodoro timer and subtask checklist'
        }
      },
      {
        type: 'feature',
        text: {
          de: 'Mobile: KI-Schnellerfassung – Smart-Text erkennt automatisch Datum, Priorität und Dauer',
          en: 'Mobile: AI quick capture – Smart text automatically detects date, priority and duration'
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

