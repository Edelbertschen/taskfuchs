import type { ParsedTask, ParseResult, TaskPriority } from '../types';

// Regex patterns for parsing
const PATTERNS = {
  // Time patterns: 20m, 1h, 2h30m, 90min
  time: /(?:^|\s)(\d+(?:\.\d+)?)\s*(m|min|h|std|stunden?|minuten?)/gi,
  
  // Tags: #haushalt, #work, #important (STRICT: only if preceded by space or at start)
  tags: /(?<=^|\s)#([a-zA-ZäöüßÄÖÜ0-9_-]+)/g,
  
  // Priority indicators: !, !!, !!!, hoch, mittel, niedrig
  priority: /(^|\s)(!!!|!!|!|hoch|mittel|niedrig|high|medium|low)(?=\s|$|[a-zA-ZäöüßÄÖÜ])/gi,
  
  // Date patterns: 12.05.2024, 12.05., morgen, heute, übermorgen
  date: /(?:^|\s)(heute|morgen|übermorgen|today|tomorrow|(\d{1,2})\.(\d{1,2})\.(?:(\d{4})|(\d{2}))?)/gi,
  
  // Description separator: n, note, beschreibung (only as whole words at end or followed by content)
  description: /(?:^|\s)\b(n|note|beschreibung|desc)\b\s+(.+)$/gi,
  
  // Column indicators: inbox, heute, morgen, backlog, projekt
  column: /(?:^|\s)@(inbox|heute|morgen|backlog|projekt|today|tomorrow|project)(?:\s|$)/gi,
  
  // Zammad URLs for automatic ticket tagging
  zammadUrl: /https:\/\/unique\.zammad\.com[^\s]*/gi
};

export function parseTaskInput(input: string): ParseResult {
  const errors: string[] = [];
  const suggestions: string[] = [];
  
  try {
    // Start with the full input as title
    let title = input.trim();
    let description: string | undefined;
    let estimatedTime: number | undefined;
    let priority: TaskPriority | undefined;
    let dueDate: string | undefined;
    let tags: string[] = [];
    let columnId: string | undefined; // Only set by explicit @column assignments, never automatically
    // ✨ MARKDOWN PRESERVED: Keep all markdown formatting as-is

    // Extract tags
    const tagMatches = [...input.matchAll(PATTERNS.tags)];
    tags = tagMatches.map(match => match[1].toLowerCase());
    
    // Remove tags from title
    title = title.replace(PATTERNS.tags, '').trim();

    // Extract description EARLY (before other processing)
    const descMatches = [...title.matchAll(PATTERNS.description)];
    if (descMatches.length > 0) {
      const descMatch = descMatches[0];
      if (descMatch[2]) {
        description = descMatch[2].trim();
      }
      
      // Remove description part from title
      title = title.replace(descMatch[0], '').trim();
    }

    // Extract time (match against current title to keep removal consistent)
    const timeMatches = [...title.matchAll(PATTERNS.time)];
    if (timeMatches.length > 0) {
      const timeMatch = timeMatches[0];
      const amount = parseFloat(timeMatch[1]);
      const unit = timeMatch[2].toLowerCase();
      
      if (unit.startsWith('h') || unit.startsWith('std')) {
        estimatedTime = Math.round(amount * 60); // Convert hours to minutes
      } else {
        estimatedTime = Math.round(amount); // Already in minutes
      }
      
      // Don't set estimatedTime if it's 0 or negative
      if (estimatedTime <= 0) {
        estimatedTime = undefined;
      }
      
      // Remove time from title using the exact matched slice from current title
      title = title.replace(timeMatch[0], '').trim();
    }

    // Extract priority (match against current title)
    const priorityMatches = [...title.matchAll(PATTERNS.priority)];
    if (priorityMatches.length > 0) {
      const priorityMatch = priorityMatches[0][2].toLowerCase(); // Changed from [1] to [2] since [1] is now the prefix
      
      if (priorityMatch === '!!!' || priorityMatch === 'hoch' || priorityMatch === 'high') {
        priority = 'high';
      } else if (priorityMatch === '!!' || priorityMatch === 'mittel' || priorityMatch === 'medium') {
        priority = 'medium';
      } else if (priorityMatch === '!' || priorityMatch === 'niedrig' || priorityMatch === 'low') {
        priority = 'low';
      }
      
      // Remove priority from title, but keep the prefix (space/start) if it's a space
      const fullMatch = priorityMatches[0][0];
      const prefix = priorityMatches[0][1];
      const priorityPart = priorityMatches[0][2];
      
      // Replace the full match in current title; preserve space if it was a space prefix
      title = title.replace(fullMatch, prefix === ' ' ? ' ' : '').trim();
    }

    // Extract date - ONLY set dueDate, match against current title
    const dateMatches = [...title.matchAll(PATTERNS.date)];
    if (dateMatches.length > 0) {
      const dateMatch = dateMatches[0];
      const dateStr = dateMatch[1].toLowerCase();
      
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfterTomorrow = new Date(today);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
      
      if (dateStr === 'heute' || dateStr === 'today') {
        dueDate = today.toISOString().split('T')[0];
        // NO automatic columnId assignment - task stays in target column
      } else if (dateStr === 'morgen' || dateStr === 'tomorrow') {
        dueDate = tomorrow.toISOString().split('T')[0];
        // NO automatic columnId assignment - task stays in target column
      } else if (dateStr === 'übermorgen') {
        dueDate = dayAfterTomorrow.toISOString().split('T')[0];
        // NO automatic columnId assignment - task stays in target column
      } else if (dateMatch[2] && dateMatch[3]) {
        // Parse dd.mm.yyyy or dd.mm. format
        const day = parseInt(dateMatch[2]);
        const month = parseInt(dateMatch[3]) - 1; // JS months are 0-based
        let year = today.getFullYear();
        
        if (dateMatch[4]) {
          year = parseInt(dateMatch[4]);
        } else if (dateMatch[5]) {
          year = 2000 + parseInt(dateMatch[5]);
        }
        
        const parsedDate = new Date(year, month, day);
        dueDate = parsedDate.toISOString().split('T')[0];
        
        // NO automatic columnId assignment - task stays in target column
      }
      
      // Remove date from title using current match
      title = title.replace(dateMatch[0], '').trim();
    }

    // Extract column - ONLY explicit @column assignments set columnId (match against current title)
    const columnMatches = [...title.matchAll(PATTERNS.column)];
    if (columnMatches.length > 0) {
      const columnMatch = columnMatches[0][1].toLowerCase();
      
      // Only explicit @column assignments change the column
      switch (columnMatch) {
        case 'inbox':
          columnId = 'inbox';
          break;
        case 'heute':
        case 'today':
          // Use correct date-based column ID for today
          const todayStr = new Date().toISOString().split('T')[0];
          columnId = `date-${todayStr}`;
          break;
        case 'morgen':
        case 'tomorrow':
          // Use correct date-based column ID for tomorrow
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowStr = tomorrow.toISOString().split('T')[0];
          columnId = `date-${tomorrowStr}`;
          break;
        case 'backlog':
          columnId = 'backlog';
          break;
        case 'projekt':
        case 'project':
          columnId = 'projects';
          break;
      }
      
      // Remove column from title
      title = title.replace(columnMatches[0][0], '').trim();
    }

    // Clean up title
    title = title.replace(/\s+/g, ' ').trim();

    // ✨ AUTO-TAG: Add #ticket tag for Zammad URLs
    const fullText = `${title} ${description || ''}`;
    const zammadMatches = [...fullText.matchAll(PATTERNS.zammadUrl)];
    if (zammadMatches.length > 0) {
      if (!tags.includes('ticket')) {
        tags.push('ticket');
      }
    }

    // Validation
    if (!title) {
      errors.push('Aufgabentitel ist erforderlich');
    }

    if (title.length > 200) {
      errors.push('Aufgabentitel ist zu lang (maximal 200 Zeichen)');
    }

    if (description && description.length > 1000) {
      errors.push('Beschreibung ist zu lang (maximal 1000 Zeichen)');
    }

    if (estimatedTime && (estimatedTime < 1 || estimatedTime > 1440)) {
      errors.push('Zeitschätzung muss zwischen 1 Minute und 24 Stunden liegen');
    }

    // Generate suggestions
    if (!priority) {
      suggestions.push('Tipp: Verwenden Sie ! für niedrige, !! für mittlere oder !!! für hohe Priorität');
    }

    if (!tags.length) {
      suggestions.push('Tipp: Verwenden Sie #tags zur Organisation (z.B. #arbeit, #privat)');
    }

    if (!estimatedTime) {
      suggestions.push('Tipp: Geben Sie eine Zeitschätzung an (z.B. 30m, 1h, 90min)');
    }

    if (!dueDate && !columnId) {
      suggestions.push('Tipp: Verwenden Sie @heute, @morgen oder @inbox zur expliziten Spalten-Zuordnung');
    }

    const parsedTask: ParsedTask = {
      title,
      description,
      estimatedTime,
      dueDate,
      priority,
      tags,
      columnId // Only set by explicit @column assignments, never automatically
    };

    return {
      success: errors.length === 0,
      task: parsedTask,
      errors,
      suggestions
    };

  } catch (error) {
    console.error('Error parsing task input:', error);
    return {
      success: false,
      errors: ['Fehler beim Parsen der Eingabe'],
      suggestions: []
    };
  }
}

// Helper function to get examples
export function getParsingExamples(): string[] {
  return [
    'Waschmaschine 20m n Waschpulver nicht vergessen #haushalt',
    'Meeting vorbereiten 1h !! @heute #arbeit',
    'Einkaufen gehen morgen #privat',
    'Projekt Review 2h30m !!! 15.05.2024 #work',
    'Zahnarzttermin @morgen 45min #gesundheit',
    'Backup erstellen 30min ! n Server-Backup durchführen #it',
    '**Wichtige Aufgabe** erledigen 30m ! #wichtig',
    '*Präsentation* vorbereiten 2h !! n Folien ~~überprüfen~~ und `Code` einbauen #meeting',
    // intentionally compact: no external ticket/mail examples
  ];
}

// Helper function to get help text
export function getParsingHelp(): { category: string; items: string[] }[] {
  return [
    {
      category: 'Zeitangaben',
      items: [
        '20m, 30min = 20/30 Minuten',
        '1h, 2h30m = 1 Stunde, 2 Stunden 30 Minuten',
        '90min = 90 Minuten'
      ]
    },
    {
      category: 'Prioritäten',
      items: [
        '! = Niedrige Priorität',
        '!! = Mittlere Priorität',
        '!!! = Hohe Priorität',
        'Oder: niedrig, mittel, hoch'
      ]
    },
    {
      category: 'Tags',
      items: [
        '#arbeit, #privat, #haushalt',
        '#wichtig, #projekt, #meeting',
        'Tags brauchen Leerzeichen: "Text #tag"',
        'Nicht erkannt: "Text#tag" (ohne Leerzeichen)',
        'Auto-Tag #ticket bei Zammad-URLs'
      ]
    },
    {
      category: 'Termine',
      items: [
        'heute, morgen, übermorgen',
        '15.05.2024, 15.05.',
        'Automatische Spaltenzuordnung'
      ]
    },
    {
      category: 'Spalten',
      items: [
        '@inbox = Inbox-Spalte',
        '@heute = Heute-Spalte',
        '@morgen = Morgen-Spalte',
        '@backlog = Backlog-Spalte'
      ]
    },
    {
      category: 'Beschreibung',
      items: [
        'n Beschreibung hier',
        'note Beschreibung hier',
        'Wird als Beschreibung gespeichert'
      ]
    },
    {
      category: 'Markdown-Formatierung',
      items: [
        'Markdown wird komplett übernommen',
        '**fett**, *kursiv*, ~~durchgestrichen~~',
        '`code`, # Überschrift',
        '[Link-Text](https://example.com)',
        'Keine automatische Link-Extraktion'
      ]
    },
    {
      category: 'Zammad-Integration',
      items: [
        'https://unique.zammad.com URLs erkannt',
        'Automatisches Tag #ticket hinzugefügt',
        'Funktioniert in Titel und Beschreibung'
      ]
    }
  ];
} 