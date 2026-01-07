import React from 'react';
import { 
  Inbox, 
  CheckCircle2, 
  Calendar, 
  Pin, 
  Archive, 
  FolderKanban,
  Search,
  Tag,
  FileText,
  Sparkles
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface EmptyStateProps {
  variant: 'inbox' | 'today' | 'tasks' | 'pins' | 'archive' | 'projects' | 'search' | 'tags' | 'notes' | 'filter';
  title?: string;
  subtitle?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const VARIANTS = {
  inbox: {
    icon: Inbox,
    gradient: 'from-blue-500/20 to-indigo-500/20',
    iconColor: 'text-blue-500',
    defaultTitle: 'Inbox leer',
    defaultSubtitle: 'Alle Aufgaben wurden verarbeitet',
    animation: 'animate-bounce-slow'
  },
  today: {
    icon: CheckCircle2,
    gradient: 'from-green-500/20 to-emerald-500/20',
    iconColor: 'text-green-500',
    defaultTitle: 'Alles erledigt!',
    defaultSubtitle: 'Keine Aufgaben für heute geplant',
    animation: 'animate-pulse-slow'
  },
  tasks: {
    icon: Calendar,
    gradient: 'from-purple-500/20 to-violet-500/20',
    iconColor: 'text-purple-500',
    defaultTitle: 'Keine Aufgaben',
    defaultSubtitle: 'Erstelle deine erste Aufgabe mit "N"',
    animation: ''
  },
  pins: {
    icon: Pin,
    gradient: 'from-amber-500/20 to-orange-500/20',
    iconColor: 'text-amber-500',
    defaultTitle: 'Keine gepinnten Aufgaben',
    defaultSubtitle: 'Pinne wichtige Aufgaben für schnellen Zugriff',
    animation: ''
  },
  archive: {
    icon: Archive,
    gradient: 'from-gray-400/20 to-slate-500/20',
    iconColor: 'text-gray-500',
    defaultTitle: 'Archiv leer',
    defaultSubtitle: 'Erledigte Aufgaben erscheinen hier',
    animation: ''
  },
  projects: {
    icon: FolderKanban,
    gradient: 'from-cyan-500/20 to-teal-500/20',
    iconColor: 'text-cyan-500',
    defaultTitle: 'Keine Projekte',
    defaultSubtitle: 'Erstelle dein erstes Projekt',
    animation: ''
  },
  search: {
    icon: Search,
    gradient: 'from-rose-500/20 to-pink-500/20',
    iconColor: 'text-rose-500',
    defaultTitle: 'Keine Ergebnisse',
    defaultSubtitle: 'Versuche es mit anderen Suchbegriffen',
    animation: ''
  },
  tags: {
    icon: Tag,
    gradient: 'from-indigo-500/20 to-blue-500/20',
    iconColor: 'text-indigo-500',
    defaultTitle: 'Keine Tags',
    defaultSubtitle: 'Organisiere Aufgaben mit Tags',
    animation: ''
  },
  notes: {
    icon: FileText,
    gradient: 'from-yellow-500/20 to-amber-500/20',
    iconColor: 'text-yellow-500',
    defaultTitle: 'Keine Notizen',
    defaultSubtitle: 'Schreibe deine erste Notiz',
    animation: ''
  },
  filter: {
    icon: Search,
    gradient: 'from-slate-400/20 to-gray-500/20',
    iconColor: 'text-slate-500',
    defaultTitle: 'Keine Treffer',
    defaultSubtitle: 'Keine Aufgaben entsprechen den Filtern',
    animation: ''
  }
};

export function EmptyState({ variant, title, subtitle, action }: EmptyStateProps) {
  const { state } = useApp();
  const accentColor = state.preferences.accentColor;
  const config = VARIANTS[variant];
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {/* Animated Icon Container */}
      <div className={`relative mb-6 ${config.animation}`}>
        {/* Outer glow ring */}
        <div 
          className="absolute inset-0 rounded-full blur-xl opacity-40"
          style={{ background: `linear-gradient(135deg, ${accentColor}40, ${accentColor}20)` }}
        />
        
        {/* Main icon container */}
        <div 
          className={`relative w-24 h-24 rounded-full bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg`}
          style={{ 
            boxShadow: `0 8px 32px ${accentColor}15`
          }}
        >
          {/* Inner highlight */}
          <div className="absolute inset-2 rounded-full bg-white/50 dark:bg-gray-800/50" />
          
          {/* Icon */}
          <Icon 
            className={`relative w-10 h-10 ${config.iconColor}`} 
            strokeWidth={1.5}
          />
        </div>

        {/* Sparkle decorations for "today" variant */}
        {variant === 'today' && (
          <>
            <Sparkles 
              className="absolute -top-2 -right-2 w-5 h-5 text-yellow-400 animate-pulse" 
              style={{ animationDelay: '0.5s' }}
            />
            <Sparkles 
              className="absolute -bottom-1 -left-3 w-4 h-4 text-yellow-400/70 animate-pulse" 
              style={{ animationDelay: '1s' }}
            />
          </>
        )}
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 text-center">
        {title || config.defaultTitle}
      </h3>

      {/* Subtitle */}
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs leading-relaxed">
        {subtitle || config.defaultSubtitle}
      </p>

      {/* Optional Action Button */}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-6 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg"
          style={{ 
            backgroundColor: accentColor,
            boxShadow: `0 4px 14px ${accentColor}40`
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// CSS for custom animations (add to your global CSS or tailwind config)
// .animate-bounce-slow { animation: bounce 3s infinite; }
// .animate-pulse-slow { animation: pulse 4s infinite; }

