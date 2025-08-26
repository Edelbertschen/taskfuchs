import { CalendarEvent, CalendarSource } from '../types';
import { format, parseISO, addDays, startOfDay, endOfDay } from 'date-fns';

export class ICalService {
  private static instance: ICalService;
  private corsProxies = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
    'https://proxy.cors.sh/',
    'https://cors-anywhere.herokuapp.com/'
  ];

  public static getInstance(): ICalService {
    if (!ICalService.instance) {
      ICalService.instance = new ICalService();
    }
    return ICalService.instance;
  }

  /**
   * Fetch and parse iCal data from URL
   */
  async fetchCalendar(source: CalendarSource, daysAhead = 90): Promise<CalendarEvent[]> {
    try {
      console.log('🗓️ Fetching calendar:', source.name, source.url);
      
      const response = await this.fetchWithFallbacks(source.url);
      const icalData = await response.text();
      console.log('📄 iCal data received, length:', icalData.length);

      const events = this.parseICalData(icalData, source, daysAhead);
      console.log('📅 Parsed events:', events.length);

      return events;
    } catch (error) {
      console.error('❌ Error fetching calendar:', error);
      throw new Error(`Fehler beim Laden des Kalenders: ${error.message}`);
    }
  }

  /**
   * Try fetching URL with multiple fallback strategies
   */
  private async fetchWithFallbacks(url: string): Promise<Response> {
    const errors: string[] = [];

    // Try direct request first
    try {
      console.log('📡 Trying direct request...');
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'text/calendar,text/plain,*/*',
          'User-Agent': 'TaskFuchs Calendar Client',
          'Cache-Control': 'no-cache'
        }
      });

      if (response.ok) {
        console.log('✅ Direct request successful');
        return response;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (directError) {
      const errorMsg = `Direct request failed: ${directError.message}`;
      errors.push(errorMsg);
      console.log('🌐', errorMsg);
    }

    // Try CORS proxies
    for (let i = 0; i < this.corsProxies.length; i++) {
      const proxy = this.corsProxies[i];
      try {
        console.log(`🔄 Trying CORS proxy ${i + 1}/${this.corsProxies.length}: ${proxy}`);
        
        const proxyUrl = proxy + encodeURIComponent(url);
        const response = await fetch(proxyUrl, {
          method: 'GET',
          headers: {
            'Accept': 'text/calendar,text/plain,*/*'
          }
        });

        if (response.ok) {
          console.log(`✅ CORS proxy ${i + 1} successful`);
          return response;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (proxyError) {
        const errorMsg = `Proxy ${i + 1} failed: ${proxyError.message}`;
        errors.push(errorMsg);
        console.log('❌', errorMsg);
      }
    }

    // All methods failed
    console.error('❌ All connection methods failed:', errors);
    
    // Provide helpful error message based on common issues
    let userFriendlyError = 'Alle Verbindungsmethoden fehlgeschlagen.';
    
    if (errors.some(e => e.includes('403'))) {
      userFriendlyError = 'Zugriff verweigert (403). Der Server blockiert externe Zugriffe. Prüfen Sie:\n' +
        '• Ob die URL öffentlich zugänglich ist\n' +
        '• Ob der Kalender als "öffentlich" oder "per Link teilbar" eingestellt ist\n' +
        '• Bei Google Calendar: Verwenden Sie die geheime iCal-URL aus den Einstellungen';
    } else if (errors.some(e => e.includes('404'))) {
      userFriendlyError = 'Kalender nicht gefunden (404). Prüfen Sie die URL.';
    } else if (errors.some(e => e.includes('CORS'))) {
      userFriendlyError = 'CORS-Fehler. Der Browser blockiert den Zugriff aufgrund von Sicherheitsrichtlinien.';
    }

    throw new Error(userFriendlyError + '\n\nTechnische Details:\n' + errors.join('\n'));
  }

  /**
   * Parse iCal text data into events
   */
  private parseICalData(icalData: string, source: CalendarSource, daysAhead: number): CalendarEvent[] {
    const events: CalendarEvent[] = [];
    const lines = icalData.split(/\r?\n/);
    
    let currentEvent: Partial<CalendarEvent> | null = null;
    let inEvent = false;
    
    // Date range for filtering
    const now = new Date();
    const endDate = addDays(now, daysAhead);

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      
      // Handle line folding (lines starting with space or tab)
      while (i + 1 < lines.length && (lines[i + 1].startsWith(' ') || lines[i + 1].startsWith('\t'))) {
        i++;
        line += lines[i].substring(1);
      }

      if (line === 'BEGIN:VEVENT') {
        inEvent = true;
        currentEvent = {
          id: `${source.id}-${Date.now()}-${Math.random()}`,
          calendarUrl: source.url,
        };
      } else if (line === 'END:VEVENT' && inEvent && currentEvent) {
        if (this.isValidEvent(currentEvent) && this.isInDateRange(currentEvent, now, endDate)) {
          // Use UID-based ID if available for better consistency
          if (currentEvent.uid) {
            currentEvent.id = `${source.id}-${currentEvent.uid}`;
          }
          events.push(currentEvent as CalendarEvent);
        }
        currentEvent = null;
        inEvent = false;
      } else if (inEvent && currentEvent) {
        this.parseEventProperty(line, currentEvent);
      }
    }

    // Sort events by start time
    return events.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }

  /**
   * Parse individual event property
   */
  private parseEventProperty(line: string, event: Partial<CalendarEvent>) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) return;

    const property = line.substring(0, colonIndex);
    const value = line.substring(colonIndex + 1);

    // Parse property name and parameters
    const [propName, ...params] = property.split(';');

    switch (propName) {
      case 'UID':
        event.uid = value;
        break;
      case 'SUMMARY':
        event.title = this.unescapeText(value);
        break;
      case 'DESCRIPTION':
        event.description = this.unescapeText(value);
        break;
      case 'LOCATION':
        event.location = this.unescapeText(value);
        break;
      case 'URL':
        event.url = value;
        break;
      case 'DTSTART':
        event.startTime = this.parseDateTime(value, params);
        event.allDay = this.isAllDayEvent(value, params);
        break;
      case 'DTEND':
        event.endTime = this.parseDateTime(value, params);
        break;
      case 'DURATION':
        if (event.startTime && !event.endTime) {
          event.endTime = this.addDuration(event.startTime, value);
        }
        break;
      case 'DTSTAMP':
      case 'LAST-MODIFIED':
        event.lastModified = this.parseDateTime(value, params);
        break;
      case 'CREATED':
        event.created = this.parseDateTime(value, params);
        break;
      case 'STATUS':
        event.status = value.toLowerCase() as CalendarEvent['status'];
        break;
      case 'RRULE':
        event.recurrence = value;
        break;
    }
  }

  /**
   * Parse iCal datetime string
   */
  private parseDateTime(value: string, params: string[]): string {
    // Remove timezone suffix if present
    const cleanValue = value.replace(/Z$/, '');
    
    // Check if it's a date-only value (8 characters: YYYYMMDD)
    if (cleanValue.length === 8) {
      // Date only - treat as all-day
      const year = cleanValue.substring(0, 4);
      const month = cleanValue.substring(4, 6);
      const day = cleanValue.substring(6, 8);
      return `${year}-${month}-${day}T00:00:00.000Z`;
    }
    
    // DateTime format: YYYYMMDDTHHMMSS
    if (cleanValue.length >= 15) {
      const year = cleanValue.substring(0, 4);
      const month = cleanValue.substring(4, 6);
      const day = cleanValue.substring(6, 8);
      const hour = cleanValue.substring(9, 11);
      const minute = cleanValue.substring(11, 13);
      const second = cleanValue.substring(13, 15) || '00';
      
      const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
      
      // Add Z if original had Z (UTC)
      if (value.endsWith('Z')) {
        return isoString + '.000Z';
      }
      
      // Local time - assume system timezone
      return new Date(isoString).toISOString();
    }
    
    return new Date().toISOString();
  }

  /**
   * Check if event is all-day
   */
  private isAllDayEvent(value: string, params: string[]): boolean {
    // All-day events typically have VALUE=DATE parameter or are 8-character dates
    const hasDateValue = params.some(p => p === 'VALUE=DATE');
    const isDateOnly = value.length === 8;
    return hasDateValue || isDateOnly;
  }

  /**
   * Add duration to start time
   */
  private addDuration(startTime: string, duration: string): string {
    // Parse ISO 8601 duration (P[n]Y[n]M[n]DT[n]H[n]M[n]S)
    const start = new Date(startTime);
    
    // Simple duration parsing for common cases
    const durationRegex = /PT?(\d+)([DHMS])/g;
    let match;
    
    while ((match = durationRegex.exec(duration)) !== null) {
      const value = parseInt(match[1]);
      const unit = match[2];
      
      switch (unit) {
        case 'D':
          start.setDate(start.getDate() + value);
          break;
        case 'H':
          start.setHours(start.getHours() + value);
          break;
        case 'M':
          start.setMinutes(start.getMinutes() + value);
          break;
        case 'S':
          start.setSeconds(start.getSeconds() + value);
          break;
      }
    }
    
    return start.toISOString();
  }

  /**
   * Unescape iCal text values
   */
  private unescapeText(text: string): string {
    return text
      .replace(/\\n/g, '\n')
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      .replace(/\\\\/g, '\\');
  }

  /**
   * Check if event is valid
   */
  private isValidEvent(event: Partial<CalendarEvent>): event is CalendarEvent {
    return !!(
      event.uid &&
      event.title &&
      event.startTime &&
      event.calendarUrl
    );
  }

  /**
   * Check if event is in date range
   */
  private isInDateRange(event: Partial<CalendarEvent>, start: Date, end: Date): boolean {
    if (!event.startTime) return false;
    
    const eventStart = new Date(event.startTime);
    const eventEnd = event.endTime ? new Date(event.endTime) : eventStart;
    
    // Event overlaps with range if it starts before range ends and ends after range starts
    return eventStart < end && eventEnd >= start;
  }

  /**
   * Test calendar URL connection
   */
  async testCalendarUrl(url: string): Promise<{ success: boolean; error?: string; eventCount?: number }> {
    try {
      console.log('🧪 Testing calendar URL:', url);
      
      // Use the same robust fetching mechanism as fetchCalendar
      const response = await this.fetchWithFallbacks(url);
      const content = await response.text();
      
      // Check if content looks like iCal
      if (content.includes('BEGIN:VCALENDAR') || content.includes('BEGIN:VEVENT')) {
        const eventCount = (content.match(/BEGIN:VEVENT/g) || []).length;
        console.log(`✅ Valid iCal content found with ${eventCount} events`);
        return { 
          success: true, 
          eventCount 
        };
      } else {
        console.warn('URL accessible but content doesn\'t look like iCal');
        console.log('Content preview:', content.substring(0, 200) + '...');
        return {
          success: false,
          error: 'URL ist erreichbar, aber der Inhalt ist kein gültiger iCal-Kalender.\n\nErhalten: ' + 
                 (content.length > 0 ? content.substring(0, 100) + '...' : 'Leerer Inhalt')
        };
      }
    } catch (error) {
      console.error('❌ Calendar URL test failed:', error);
      return {
        success: false,
        error: error.message || 'Unbekannter Fehler beim Testen der URL'
      };
    }
  }

  /**
   * Generate default calendar colors
   */
  static getDefaultColors(): string[] {
    return [
      '#3b82f6', // blue
      '#ef4444', // red  
      '#10b981', // green
      '#f59e0b', // yellow
      '#8b5cf6', // purple
      '#f97316', // orange
      '#06b6d4', // cyan
      '#84cc16', // lime
      '#ec4899', // pink
      '#6b7280'  // gray
    ];
  }
} 