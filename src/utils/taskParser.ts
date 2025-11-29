import type { ParsedTask, ParseResult, TaskPriority } from '../types';

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
    let projectId: string | undefined; // NEW: Project assignment
    let openProjectSelector = false; // NEW: Signal to open project selector

    // Check for standalone @ to open project selector (BEFORE other @ processing)
    const hasStandaloneAt = /(?:^|\s)@(?=\s|$)/.test(title);
    if (hasStandaloneAt) {
      openProjectSelector = true;
      // Remove the @ from title
      title = title.replace(/(?:^|\s)@(?=\s|$)/g, ' ').trim();
    }

    // ✨ MARKDOWN PRESERVED: Keep all markdown formatting as-is

    // Extract tags
    const tagMatches = [...title.matchAll(/(?:^|\s)#([a-zA-ZäöüßÄÖÜ0-9_-]+)(?=\s|$)/g)];
    tags = tagMatches.map(match => match[1].toLowerCase());
    
    // Remove tags from title
    title = title.replace(/(?:^|\s)#([a-zA-ZäöüßÄÖÜ0-9_-]+)(?=\s|$)/g, ' ').trim();

    // Extract description EARLY (before other processing)
    const descMatches = [...title.matchAll(/(?:^|\s)(n|note|beschreibung|desc)(?=\s|$)(.*)$/gm)];
    if (descMatches.length > 0) {
      const descMatch = descMatches[0];
      // With the new pattern: [0] = full match, [1] = keyword, [2] = content
      if (descMatch[2] && descMatch[2].trim()) {
        description = descMatch[2].trim();
      }
      
      // Remove description part from title
      title = title.replace(/(?:^|\s)(n|note|beschreibung|desc)(?=\s|$)(.*)$/gm, '').trim();
    }

    // Extract time (match against current title to keep removal consistent)
    const timeMatches = [...title.matchAll(/(?:^|\s)(\d+(?:\.\d+)?)\s*(m|min|h|std|stunden?|minuten?)(?=\s|$)/g)];
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
      title = title.replace(/(?:^|\s)(\d+(?:\.\d+)?)\s*(m|min|h|std|stunden?|minuten?)(?=\s|$)/g, ' ').trim();
    }

    // Extract priority (match against current title)
    const priorityMatches = [...title.matchAll(/(?:^|\s)(!!!|!!|!|hoch|mittel|niedrig|high|medium|low)(?=\s|$)/g)];
    if (priorityMatches.length > 0) {
      const priorityMatch = priorityMatches[0][1].toLowerCase(); // [1] is the priority with new regex
      
      if (priorityMatch === '!!!' || priorityMatch === 'hoch' || priorityMatch === 'high') {
        priority = 'high';
      } else if (priorityMatch === '!!' || priorityMatch === 'mittel' || priorityMatch === 'medium') {
        priority = 'medium';
      } else if (priorityMatch === '!' || priorityMatch === 'niedrig' || priorityMatch === 'low') {
        priority = 'low';
      }
      
      // Remove priority from title
      const fullMatch = priorityMatches[0][0];
      title = title.replace(/(?:^|\s)(!!!|!!|!|hoch|mittel|niedrig|high|medium|low)(?=\s|$)/g, ' ').trim();
    }

    // Extract date - ONLY set dueDate, match against current title
    // Pattern: "heute", "morgen", "übermorgen", "today", "tomorrow", or dd.mm.yyyy / dd.mm.
    const DATE_PATTERN = /(?:^|\s)(heute|morgen|übermorgen|today|tomorrow|(\d{1,2})\.(\d{1,2})\.(?:(\d{4})|(\d{2}))?)(?=\s|$)/gi;
    const dateMatches = [...title.matchAll(DATE_PATTERN)];
    
    // Helper function to format date as YYYY-MM-DD without timezone issues
    const formatDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    if (dateMatches.length > 0) {
      const dateMatch = dateMatches[0];
      const dateStr = dateMatch[1].toLowerCase();
      
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfterTomorrow = new Date(today);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
      
      if (dateStr === 'heute' || dateStr === 'today') {
        dueDate = formatDate(today);
      } else if (dateStr === 'morgen' || dateStr === 'tomorrow') {
        dueDate = formatDate(tomorrow);
      } else if (dateStr === 'übermorgen') {
        dueDate = formatDate(dayAfterTomorrow);
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
        dueDate = formatDate(parsedDate);
      }
      
      // Remove date from title - create new regex to avoid lastIndex issues
      title = title.replace(/(?:^|\s)(heute|morgen|übermorgen|today|tomorrow|(\d{1,2})\.(\d{1,2})\.(?:(\d{4})|(\d{2}))?)(?=\s|$)/gi, ' ').trim();
    }

    // Extract column - ONLY explicit @column assignments set columnId (match against current title)
    const columnMatches = [...title.matchAll(/(?:^|\s)@(inbox|heute|morgen|backlog|projekt|today|tomorrow|project)(?=\s|$)/g)];
    if (columnMatches.length > 0) {
      const columnMatch = columnMatches[0][1].toLowerCase(); // [1] is the column name with new regex
      
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
      title = title.replace(/(?:^|\s)@(inbox|heute|morgen|backlog|projekt|today|tomorrow|project)(?=\s|$)/g, ' ').trim();
    }

    // Extract project ID - @p:projectid or @proj:projectid
    const projectMatches = [...title.matchAll(/(?:^|\s)@(?:p|proj):([a-zA-Z0-9äöüßÄÖÜ_-]+)(?=\s|$)/g)];
    if (projectMatches.length > 0) {
      const projectMatch = projectMatches[0][1].toLowerCase();
      projectId = projectMatch;
      
      // Remove project from title
      title = title.replace(/(?:^|\s)@(?:p|proj):([a-zA-Z0-9äöüßÄÖÜ_-]+)(?=\s|$)/g, ' ').trim();
    }

    // Clean up title
    title = title.replace(/\s+/g, ' ').trim();

    // ✨ AUTO-TAG: Add #ticket tag for Zammad URLs
    const fullText = `${title} ${description || ''}`;
    const zammadMatches = [...fullText.matchAll(/https:\/\/unique\.zammad\.com[^\s]*/g)];
    if (zammadMatches.length > 0) {
      if (!tags.includes('ticket')) {
        tags.push('ticket');
      }
    }

    // Validation
    if (!title && !openProjectSelector) {
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
      columnId, // Only set by explicit @column assignments, never automatically
      projectId, // NEW: Project assignment
      openProjectSelector // NEW: Signal to open project selector
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
      category: 'Spalten & Projekte',
      items: [
        '@inbox = Inbox-Spalte',
        '@heute = Heute-Spalte',
        '@morgen = Morgen-Spalte',
        '@backlog = Backlog-Spalte',
        '@ = Projektauswahlliste öffnen',
        '@p:projektid = Projekt direkt zuweisen (z.B. @p:website)',
        '@proj:projektid = Alternative Projekt-Syntax'
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