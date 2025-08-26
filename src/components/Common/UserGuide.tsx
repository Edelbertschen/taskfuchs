import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronRight, CheckSquare, FileText, Calendar, Settings, Kanban, Inbox, BarChart, Archive, Clock, Search, Filter, Tag, Plus, Edit, Eye, Download, Bell, User, Keyboard, Zap, Target, Globe, Palette, Shield, Cloud, Package, Mail, Pin } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from 'react-i18next';

interface UserGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GuideSection {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  content: React.ReactNode;
}

export function UserGuide({ isOpen, onClose }: UserGuideProps) {
  const { state } = useApp();
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState('overview');
  
  // Handle ESC key and backdrop clicks
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);
  
  const getAccentColorStyles = () => {
    const accentColor = state.preferences.accentColor;
    return {
      text: { color: accentColor },
      bg: { backgroundColor: accentColor },
      bgLight: { backgroundColor: accentColor + '20' },
      border: { borderColor: accentColor }
    };
  };

  const guideSections: GuideSection[] = [
    {
      id: 'overview',
              title: t('user_guide.sections.overview.title'),
      icon: Target,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {t('user_guide.welcome_title')}
            </h2>
            <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed mb-6">
                      {t('user_guide.sections.overview.subtitle')}
        {t('user_guide.sections.overview.description')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-3 mb-3">
                <CheckSquare className="w-6 h-6" style={getAccentColorStyles().text} />
                <h3 className="font-semibold text-gray-900 dark:text-white">{t('user_guide.sections.overview.features.tasks.title')}</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('user_guide.sections.overview.features.tasks.description')}
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-3 mb-3">
                <FileText className="w-6 h-6" style={getAccentColorStyles().text} />
                <h3 className="font-semibold text-gray-900 dark:text-white">{t('user_guide.sections.overview.features.notes.title')}</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('user_guide.sections.overview.features.notes.description')}
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-3 mb-3">
                <Kanban className="w-6 h-6" style={getAccentColorStyles().text} />
                <h3 className="font-semibold text-gray-900 dark:text-white">{t('user_guide.sections.overview.features.kanban.title')}</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('user_guide.sections.overview.features.kanban.description')}
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-3 mb-3">
                <Clock className="w-6 h-6" style={getAccentColorStyles().text} />
                <h3 className="font-semibold text-gray-900 dark:text-white">{t('user_guide.sections.overview.features.timer.title')}</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('user_guide.sections.overview.features.timer.description')}
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-3 mb-3">
                <Pin className="w-6 h-6" style={getAccentColorStyles().text} />
                <h3 className="font-semibold text-gray-900 dark:text-white">{t('user_guide.sections.overview.features.pins.title')}</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('user_guide.sections.overview.features.pins.description')}
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-3 mb-3">
                <Mail className="w-6 h-6" style={getAccentColorStyles().text} />
                <h3 className="font-semibold text-gray-900 dark:text-white">{t('user_guide.sections.overview.features.emails.title')}</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('user_guide.sections.overview.features.emails.description')}
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'tasks',
      title: 'Aufgaben',
      icon: CheckSquare,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Aufgaben verwalten</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              TaskFuchs bietet dir mächtige Tools zur Aufgabenverwaltung.
            </p>
          </div>

          <div className="space-y-4">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Plus className="w-5 h-5" style={getAccentColorStyles().text} />
                <h3 className="font-semibold text-gray-900 dark:text-white">Neue Aufgabe erstellen</h3>
              </div>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>• Klicke auf den <strong>+ Button</strong> oder nutze <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">N</kbd> oder <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">⌘ N</kbd></li>
                <li>• Nutze den <strong>Smart Task Input</strong> für schnelle Eingabe: "Einkaufen #privat !hoch morgen 15:00"</li>
                <li>• Füge Beschreibungen in Markdown hinzu</li>
                <li>• Setze Prioritäten: Keine, Niedrig, Mittel, Hoch</li>
              </ul>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Edit className="w-5 h-5" style={getAccentColorStyles().text} />
                <h3 className="font-semibold text-gray-900 dark:text-white">Aufgaben bearbeiten</h3>
              </div>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>• Rechtsklick auf eine Aufgabe öffnet das Kontextmenü</li>
                <li>• Doppelklick öffnet das Aufgaben-Detail-Modal</li>
                <li>• Drag & Drop zum Verschieben zwischen Spalten</li>
                <li>• Timer starten durch Klick auf das Timer-Symbol</li>
              </ul>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Eye className="w-5 h-5" style={getAccentColorStyles().text} />
                <h3 className="font-semibold text-gray-900 dark:text-white">Aufgaben-Organisation</h3>
              </div>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>• Organisiere Aufgaben in <strong>Spalten</strong> nach Datum oder Projekt</li>
                <li>• Nutze <strong>Tags</strong> für Kategorisierung</li>
                <li>• Setze <strong>Prioritäten</strong> für wichtige Aufgaben</li>
                <li>• Verwende <strong>Zeitschätzungen</strong> für bessere Planung</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'smart-input',
      title: 'Smart Input',
      icon: Zap,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">⚡ Smart Task Input</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Mit dem Smart Task Input kannst du Aufgaben blitzschnell mit allen Details in einer Zeile erstellen. Die KI erkennt automatisch Prioritäten, Tags, Zeiten und mehr.
            </p>
          </div>

          <div className="space-y-6">
            {/* Basic Example */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 border-2 border-dashed border-gray-300 dark:border-gray-600">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                <span className="text-2xl mr-2">📝</span>
                Beispiel:
              </h4>
              <div className="font-mono text-lg p-3 bg-white dark:bg-gray-800 rounded-lg border" style={{ color: state.preferences.accentColor }}>
                "Meeting vorbereiten #arbeit !! 1h30m @heute note Präsentation erstellen"
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                → Titel: "Meeting vorbereiten", Tag: arbeit, Priorität: hoch, Zeit: 1.5h, Spalte: heute, Beschreibung: "Präsentation erstellen"
              </div>
            </div>

            {/* Priority Section */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <span className="w-4 h-4 rounded-full bg-red-500 mr-3"></span>
                Prioritäten
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Niedrige Priorität</span>
                  <div className="flex space-x-2">
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">!</kbd>
                    <span className="text-gray-400">oder</span>
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">niedrig</kbd>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Mittlere Priorität</span>
                  <div className="flex space-x-2">
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">!!</kbd>
                    <span className="text-gray-400">oder</span>
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">mittel</kbd>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Hohe Priorität</span>
                  <div className="flex space-x-2">
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">!!!</kbd>
                    <span className="text-gray-400">oder</span>
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">hoch</kbd>
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                💡 <strong>Auch auf Englisch:</strong> "low", "medium", "high"
              </div>
            </div>

            {/* Tags Section */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <span className="w-4 h-4 rounded-full bg-blue-500 mr-3"></span>
                Tags & Kategorien
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Einzelner Tag</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">#arbeit</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Mehrere Tags</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">#arbeit #wichtig</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Beliebte Tags</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">#privat #haushalt</kbd>
                </div>
              </div>
              <div className="text-sm text-red-600 dark:text-red-400 mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded">
                ⚠️ <strong>Wichtig:</strong> Tags brauchen ein Leerzeichen davor: "Text #tag" ✓, "Text#tag" ✗
              </div>
            </div>

            {/* Time Section */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <span className="w-4 h-4 rounded-full bg-green-500 mr-3"></span>
                Zeitschätzungen
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Minuten</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">30m, 45min</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Stunden</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">1h, 2h, 3h30m</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Gemischt</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">1h15m, 2h45min</kbd>
                </div>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                💡 <strong>Auch:</strong> "std", "stunden", "minuten" (Deutsch)
              </div>
            </div>

            {/* Date Section */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <span className="w-4 h-4 rounded-full bg-purple-500 mr-3"></span>
                Termine & Daten
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Relative Daten</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">heute, morgen</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Englisch</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">today, tomorrow</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Spezifische Daten</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">15.05.2024</kbd>
                </div>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                📅 <strong>Automatische Zuordnung</strong> zu entsprechenden Datumsspalten
              </div>
            </div>

            {/* Column Section */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <span className="w-4 h-4 rounded-full bg-orange-500 mr-3"></span>
                Spalten-Zuordnung
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Inbox</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">@inbox</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Heute</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">@heute</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Morgen</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">@morgen</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Backlog</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">@backlog</kbd>
                </div>
              </div>
            </div>

            {/* Description Section */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <span className="w-4 h-4 rounded-full bg-cyan-500 mr-3"></span>
                Beschreibungen & Notizen
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Beschreibung hinzufügen</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">note Text</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Alternative</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">n Text</kbd>
                </div>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                💡 <strong>Tipp:</strong> Alles nach "note " wird als Beschreibung gespeichert
              </div>
            </div>

            {/* Markdown Section */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <span className="w-4 h-4 rounded-full bg-pink-500 mr-3"></span>
                Markdown & Links
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Formatierungen</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">**fett** *kursiv*</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Durchgestrichen</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">~~text~~</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Links</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">[Text](url)</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Code</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">`code`</kbd>
                </div>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                🔗 <strong>Links</strong> werden automatisch in die Beschreibung eingefügt
              </div>
            </div>

            {/* Complex Example */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg p-4 border-2 border-dashed border-gray-300 dark:border-gray-600">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                <span className="text-2xl mr-2">🚀</span>
                Komplexes Beispiel:
              </h4>
              <div className="font-mono text-lg p-3 bg-white dark:bg-gray-800 rounded-lg border break-all" style={{ color: state.preferences.accentColor }}>
                "**Wichtiges** Meeting #arbeit #kunde !!! 2h @heute note Präsentation vorbereiten und [Dokument](https://docs.com) überprüfen"
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                ✨ <strong>Ergebnis:</strong> Fetter Titel, Tags: arbeit+kunde, Priorität: hoch, 2 Stunden, heute-Spalte, Beschreibung mit Link
              </div>
            </div>

            {/* Pro Tips */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-3 flex items-center">
                <span className="text-2xl mr-2">💡</span>
                Profi-Tipps:
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-2">
                <li>• <strong>Reihenfolge ist egal:</strong> "#tag !!! 30m Titel" funktioniert genauso</li>
                <li>• <strong>Leerzeichen sind wichtig:</strong> "#tag" ✓, aber "text#tag" ✗</li>
                <li>• <strong>Mehrere Tags:</strong> "#tag1 #tag2 #tag3" - alle werden erkannt</li>
                <li>• <strong>Auto-Vervollständigung:</strong> Die App schlägt passende Tags vor</li>
                <li>• <strong>Kombinierbar:</strong> Alle Features können in einer Eingabe verwendet werden</li>
                <li>• <strong>Chain-Input:</strong> In Projekten bleibt das Modal nach Erstellen offen für weitere Eingaben</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'pins',
      title: 'Pins',
      icon: Pin,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('pins.important_tasks_overview')}</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              {t('pins.pins_description')}
            </p>
          </div>

          <div className="space-y-4">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Pin className="w-5 h-5" style={getAccentColorStyles().text} />
                <h3 className="font-semibold text-gray-900 dark:text-white">{t('pins.pinning_tasks')}</h3>
              </div>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>• <strong>Im TaskModal:</strong> {t('pins.select_pin_column_dropdown')}</li>
                <li>• <strong>Im Kontextmenü:</strong> {t('pins.right_click_pin_options')}</li>
                <li>• <strong>Drag & Drop:</strong> Ziehe Aufgaben direkt ins Pins-Board</li>
                <li>• <strong>Mehrfache Ansicht:</strong> Gepinnte Aufgaben bleiben in ihrer ursprünglichen Position</li>
              </ul>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Edit className="w-5 h-5" style={getAccentColorStyles().text} />
                <h3 className="font-semibold text-gray-900 dark:text-white">Spalten verwalten</h3>
              </div>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>• <strong>Neue Spalte:</strong> "Spalte hinzufügen" Button im Header</li>
                <li>• <strong>Spalte umbenennen:</strong> Doppelklick auf den Spaltentitel</li>
                <li>• <strong>Spalten sortieren:</strong> Drag & Drop der Spalten-Header</li>
                <li>• <strong>Spaltenanzahl:</strong> 3, 5 oder 7 Spalten über die Buttons unten</li>
              </ul>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Target className="w-5 h-5" style={getAccentColorStyles().text} />
                <h3 className="font-semibold text-gray-900 dark:text-white">Best Practices</h3>
              </div>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>• <strong>Kategorien erstellen:</strong> z.B. "Dringend", "Diese Woche", "Wichtige Projekte"</li>
                <li>• <strong>Workflow optimieren:</strong> Nutze Pins für tägliche Review-Routine</li>
                <li>• <strong>Fokus behalten:</strong> Maximal 5-7 Aufgaben pro Spalte</li>
                <li>• <strong>Regelmäßig aufräumen:</strong> {t('pins.auto_unpin_completed_tasks')}</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'emails',
      title: 'E-Mails',
      icon: Mail,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">📧 E-Mail Integration</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Importiere und verwalte wichtige E-Mails direkt in TaskFuchs. Perfekt für die Verknüpfung von 
              E-Mail-Inhalten mit Aufgaben und Projekten.
            </p>
          </div>

          <div className="space-y-4">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Download className="w-5 h-5" style={getAccentColorStyles().text} />
                <h3 className="font-semibold text-gray-900 dark:text-white">E-Mails importieren</h3>
              </div>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>• <strong>EML-Dateien:</strong> Drag & Drop oder Datei-Upload im E-Mail-Modal</li>
                <li>• <strong>Aus Webmail:</strong> E-Mail als .eml speichern und importieren</li>
                <li>• <strong>Automatische Verarbeitung:</strong> MIME-Grenzen und Anhänge werden bereinigt</li>
                <li>• <strong>Formatierung:</strong> E-Mails werden wie im E-Mail-Client dargestellt</li>
              </ul>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Edit className="w-5 h-5" style={getAccentColorStyles().text} />
                <h3 className="font-semibold text-gray-900 dark:text-white">E-Mails verwalten</h3>
              </div>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>• <strong>Im Mails-Tab:</strong> Alle importierten E-Mails chronologisch sortiert</li>
                <li>• <strong>Titel bearbeiten:</strong> E-Mail-Titel für bessere Organisation anpassen</li>
                <li>• <strong>Verknüpfungen:</strong> E-Mails mit Aufgaben und anderen Notizen verlinken</li>
                <li>• <strong>Suche:</strong> Volltextsuche in E-Mail-Inhalten</li>
              </ul>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Target className="w-5 h-5" style={getAccentColorStyles().text} />
                <h3 className="font-semibold text-gray-900 dark:text-white">Anwendungsfälle</h3>
              </div>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>• <strong>Projektdokumentation:</strong> Wichtige Projekt-E-Mails archivieren</li>
                <li>• <strong>Aufgaben erstellen:</strong> Aus E-Mail-Inhalten direkte Aufgaben ableiten</li>
                <li>• <strong>Referenzen:</strong> Wichtige Informationen für später aufbewahren</li>
                <li>• <strong>Follow-ups:</strong> E-Mails mit Aufgaben verknüpfen für Nachverfolgung</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'shortcuts',
      title: 'Shortcuts',
      icon: Keyboard,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">⌨️ Tastatur-Shortcuts</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Arbeite effizienter mit diesen praktischen Tastenkombinationen. TaskFuchs unterstützt sowohl Windows/Linux (Strg) als auch macOS (⌘) Shortcuts.
            </p>
          </div>

          <div className="space-y-6">
            {/* Navigation Shortcuts */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <span className="text-2xl mr-2">🧭</span>
                Navigation
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Dashboard</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">1</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Inbox</span>
                  <div className="flex space-x-1">
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">2</kbd>
                    <span className="text-gray-400">oder</span>
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">I</kbd>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Planer</span>
                  <div className="flex space-x-1">
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">3</kbd>
                    <span className="text-gray-400">oder</span>
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">T</kbd>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Projekte</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">4</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Notizen</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">5</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Pins</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">6</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Tags</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">7</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Statistiken</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">8</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Archiv</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">9</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Einstellungen</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">0</kbd>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <span className="text-2xl mr-2">⚡</span>
                Schnellaktionen
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Neue Aufgabe</span>
                  <div className="flex space-x-1">
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">N</kbd>
                    <span className="text-gray-400">oder</span>
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">⌘ N</kbd>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Suche öffnen</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">⌘ K</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Einstellungen</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">⌘ ,</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Theme wechseln</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">⌘ D</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Hilfe öffnen</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">?</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Modal schließen</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">Esc</kbd>
                </div>
              </div>
            </div>

            {/* Focus & Timer */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <span className="text-2xl mr-2">🎯</span>
                Fokus & Timer
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Fokus-Modus</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">F</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Review-Modus</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">R</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Timer pausieren/fortsetzen</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">Leertaste</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Fokus verlassen</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">Esc</kbd>
                </div>
              </div>
            </div>

            {/* Board Navigation */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <span className="text-2xl mr-2">📅</span>
                Board-Navigation
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Vorheriger Tag</span>
                  <div className="flex space-x-1">
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">←</kbd>
                    <span className="text-gray-400">oder</span>
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">H</kbd>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Nächster Tag</span>
                  <div className="flex space-x-1">
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">→</kbd>
                    <span className="text-gray-400">oder</span>
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">L</kbd>
                  </div>
                </div>
              </div>
              <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                <strong>Hinweis:</strong> Funktioniert im Planer und Review-Modus
              </div>
            </div>

            {/* Review Mode Shortcuts */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <span className="text-2xl mr-2">🔍</span>
                Review-Modus
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Nächste Aufgabe</span>
                  <div className="flex space-x-1">
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">Leertaste</kbd>
                    <span className="text-gray-400">oder</span>
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">→</kbd>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Vorherige Aufgabe</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">←</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Aufgabe überspringen</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">S</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Archivieren</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">A</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Bearbeiten</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">E</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Zeit schätzen</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">M</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Kalender öffnen</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">C</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Review planen</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">R</kbd>
                </div>
              </div>
            </div>

            {/* Pro Tips */}
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                <span className="text-2xl mr-2">💡</span>
                Pro-Tipps
              </h3>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li>• <strong>Vim-Style Navigation:</strong> Nutze H/L für Board-Navigation</li>
                <li>• <strong>Quick Switch:</strong> Drücke F um schnell in den Fokus-Modus zu wechseln</li>
                <li>• <strong>Timer Control:</strong> Leertaste pausiert/startet Timer von überall</li>
                <li>• <strong>Universal ESC:</strong> Escape schließt alle Modals und verlässt Modi</li>
                <li>• <strong>Cross-Platform:</strong> ⌘ auf Mac, Strg auf Windows/Linux</li>
                <li>• <strong>Smart Input:</strong> Alle Shortcuts funktionieren nicht in Eingabefeldern</li>
              </ul>
            </div>

            {/* Keyboard Layout Reference */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                <span className="text-2xl mr-2">⌨️</span>
                Tastatur-Layout Referenz
              </h3>
              <div className="grid grid-cols-10 gap-1 text-xs">
                <div className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-1 text-center">1<br/><span className="text-xs text-gray-500">Today</span></div>
                <div className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-1 text-center">2<br/><span className="text-xs text-gray-500">Inbox</span></div>
                <div className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-1 text-center">3<br/><span className="text-xs text-gray-500">Tasks</span></div>
                <div className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-1 text-center">4<br/><span className="text-xs text-gray-500">Kanban</span></div>
                <div className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-1 text-center">5<br/><span className="text-xs text-gray-500">Notes</span></div>
                <div className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-1 text-center">6<br/><span className="text-xs text-gray-500">Tags</span></div>
                <div className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-1 text-center">7<br/><span className="text-xs text-gray-500">Stats</span></div>
                <div className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-1 text-center">8<br/><span className="text-xs text-gray-500">Archive</span></div>
                <div className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-1 text-center">9<br/><span className="text-xs text-gray-500">Settings</span></div>
                <div className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-1 text-center">0</div>
              </div>
              <div className="mt-2 grid grid-cols-10 gap-1 text-xs">
                <div className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-1 text-center">T<br/><span className="text-xs text-gray-500">Today</span></div>
                <div className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-1 text-center">R<br/><span className="text-xs text-gray-500">Review</span></div>
                <div className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-1 text-center">F<br/><span className="text-xs text-gray-500">Focus</span></div>
                <div className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-1 text-center">I<br/><span className="text-xs text-gray-500">Inbox</span></div>
                <div className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-1 text-center">N<br/><span className="text-xs text-gray-500">New</span></div>
                <div className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-1 text-center">H<br/><span className="text-xs text-gray-500">←</span></div>
                <div className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-1 text-center">L<br/><span className="text-xs text-gray-500">→</span></div>
                <div className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-1 text-center">?<br/><span className="text-xs text-gray-500">Help</span></div>
                <div className="col-span-2 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-600 rounded p-1 text-center">Space<br/><span className="text-xs text-blue-600 dark:text-blue-400">Timer</span></div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'settings',
      title: 'Einstellungen',
      icon: Settings,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">App-Einstellungen</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Passe TaskFuchs an deine Bedürfnisse an.
            </p>
          </div>

          <div className="space-y-4">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Palette className="w-5 h-5" style={getAccentColorStyles().text} />
                <h3 className="font-semibold text-gray-900 dark:text-white">Erscheinungsbild</h3>
              </div>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>• Wähle zwischen hellem und dunklem Design</li>
                <li>• Passe die Akzentfarbe an</li>
                <li>• Konfiguriere Sidebar-Verhalten</li>
                <li>• Anpassbare Widget-Layouts</li>
              </ul>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Bell className="w-5 h-5" style={getAccentColorStyles().text} />
                <h3 className="font-semibold text-gray-900 dark:text-white">Benachrichtigungen</h3>
              </div>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>• Konfiguriere Sound-Benachrichtigungen</li>
                <li>• Erinnerungs-Verhalten anpassen</li>
                <li>• Timer-Sounds und -Verhalten</li>
                <li>• End-of-Day Zusammenfassungen</li>
              </ul>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Package className="w-5 h-5" style={getAccentColorStyles().text} />
                <h3 className="font-semibold text-gray-900 dark:text-white">Datenmanagement</h3>
              </div>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>• Exportiere alle Daten als JSON</li>
                <li>• Importiere Daten aus anderen Apps</li>
                <li>• Backup und Wiederherstellung</li>
                <li>• Daten löschen und zurücksetzen</li>
              </ul>
            </div>
          </div>
        </div>
      )
    }
  ];

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99999] flex items-center justify-center p-4"
      style={{ isolation: 'isolate' }}
      onClick={onClose}
    >
      <div 
        className="w-full max-w-6xl h-[85vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex relative my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button - Top Right */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>

        {/* Sidebar with Tabs */}
        <div className="w-72 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div 
                className="p-2 rounded-lg"
                style={getAccentColorStyles().bgLight}
              >
                <Target className="w-6 h-6" style={getAccentColorStyles().text} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Benutzeranleitung
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  TaskFuchs Hilfe
                </p>
              </div>
            </div>
          </div>
          
          <div className="p-4 space-y-2 overflow-y-auto h-[calc(100%-120px)]">
            {guideSections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-all duration-200 ${
                    isActive
                      ? 'text-white shadow-sm'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                  style={isActive ? getAccentColorStyles().bg : {}}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">{section.title}</span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="p-8">
              {guideSections.find(section => section.id === activeSection)?.content}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
} 