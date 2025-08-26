import type { 
  CalDAVTodo, 
  CalDAVSyncResult, 
  CalDAVConflict, 
  CalDAVSyncOptions, 
  CalDAVCalendar, 
  CalDAVConnection,
  Task 
} from '../types';
import { corsProxy } from './corsProxy';

// CalDAV Auto-Sync Manager
class CalDAVAutoSyncManager {
  private static instance: CalDAVAutoSyncManager;
  private syncTimer: NodeJS.Timeout | null = null;
  private onTasksUpdatedCallback: ((tasks: Task[]) => void) | null = null;
  private lastSyncAttempt: Date | null = null;

  static getInstance(): CalDAVAutoSyncManager {
    if (!CalDAVAutoSyncManager.instance) {
      CalDAVAutoSyncManager.instance = new CalDAVAutoSyncManager();
    }
    return CalDAVAutoSyncManager.instance;
  }

  public setupAutoSync(connection: CalDAVConnection, preferences: any, tasks: Task[]): void {
    console.log('🔄 Setting up CalDAV auto-sync...', {
      enabled: preferences?.caldav?.enabled,
      autoSync: preferences?.caldav?.autoSync,
      interval: preferences?.caldav?.syncInterval
    });

    // Clear existing timer
    this.stopAutoSync();

    // Setup new timer if enabled
    if (preferences?.caldav?.enabled && preferences?.caldav?.autoSync && connection?.connected) {
      const intervalMs = (preferences.caldav.syncInterval || 30) * 60 * 1000;
      
      this.syncTimer = setInterval(async () => {
        try {
          console.log('⏰ Auto-sync triggered for CalDAV');
          this.lastSyncAttempt = new Date();
          
          const caldavService = new CalDAVService(connection);
          const result = await caldavService.syncTasks(tasks, {
            conflictResolution: preferences.caldav.conflictResolution || 'manual',
            onProgress: (progress, message) => {
              console.log(`📊 CalDAV auto-sync progress: ${progress}% - ${message}`);
            }
          });

          if (result.success) {
            console.log('✅ CalDAV auto-sync completed successfully', {
              added: result.added,
              updated: result.updated,
              conflicts: result.conflicts.length
            });
            
            // Update preferences with last sync time
            this.updateLastSyncTime(true);
          } else {
            console.error('❌ CalDAV auto-sync failed:', result.errors);
            this.updateLastSyncTime(false, result.errors.join(', '));
          }
        } catch (error) {
          console.error('💥 CalDAV auto-sync error:', error);
          this.updateLastSyncTime(false, error instanceof Error ? error.message : 'Unknown error');
        }
      }, intervalMs);

      console.log(`⏱️ CalDAV auto-sync started with ${preferences.caldav.syncInterval} minute interval`);
    }
  }

  public stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      console.log('🛑 CalDAV auto-sync stopped');
    }
  }

  public onTasksUpdated(callback: (tasks: Task[]) => void): void {
    this.onTasksUpdatedCallback = callback;
  }

  private updateLastSyncTime(success: boolean, error?: string): void {
    if (typeof window !== 'undefined' && (window as any).updateCalDAVSyncStatus) {
      (window as any).updateCalDAVSyncStatus({
        lastSync: new Date().toISOString(),
        lastSyncStatus: success ? 'success' : 'error',
        lastSyncError: error
      });
    }
  }

  public getLastSyncAttempt(): Date | null {
    return this.lastSyncAttempt;
  }

  public isAutoSyncActive(): boolean {
    return this.syncTimer !== null;
  }
}

// CalDAV service for Nextcloud synchronization
export class CalDAVService {
  private connection: CalDAVConnection;
  private syncInProgress = false;

  constructor(connection: CalDAVConnection) {
    this.connection = connection;
  }

  // Update connection settings
  updateConnection(connection: CalDAVConnection): void {
    this.connection = connection;
  }

  // Test connection to CalDAV server
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // First, validate connection parameters
      if (!this.connection.serverUrl || !this.connection.username || !this.connection.password) {
        return {
          success: false,
          error: 'Unvollständige Verbindungsparameter. Bitte überprüfen Sie Server-URL, Benutzername und Passwort.'
        };
      }

      console.log('🔍 CalDAV Verbindungstest gestartet:', {
        serverUrl: this.connection.serverUrl,
        username: this.connection.username,
        passwordLength: this.connection.password.length
      });

      // Step 1: Test basic connectivity with a simple GET request
      let testUrl = this.connection.serverUrl;
      if (!testUrl.endsWith('/')) {
        testUrl += '/';
      }

      console.log('📡 Teste Grundverbindung zu:', testUrl);

      let basicResponse: Response;
      
      try {
        // First try direct connection
        basicResponse = await fetch(testUrl, {
          method: 'GET',
          mode: 'cors',
          credentials: 'include',
          headers: {
            'User-Agent': 'TaskFuchs CalDAV Client',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        });

        console.log('📡 Grundverbindung Status:', basicResponse.status, basicResponse.statusText);

        if (basicResponse.status === 0) {
          throw new Error('CORS blocked - trying proxy');
        }

      } catch (basicError) {
        console.error('❌ Grundverbindung fehlgeschlagen:', basicError);
        
        // Try CORS proxy if we're in development mode and it's a fetch error
        if (corsProxy.isDevelopmentMode() && basicError instanceof TypeError && basicError.message.includes('Failed to fetch')) {
          console.log('🔄 Versuche CORS-Proxy für Grundverbindung...');
          
          try {
            corsProxy.showProxyWarning();
            
            basicResponse = await corsProxy.fetchWithProxy(testUrl, {
              method: 'GET',
              headers: {
                'User-Agent': 'TaskFuchs CalDAV Client',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              },
            });
            
            console.log(`✅ CORS Proxy Grundverbindung erfolgreich: ${basicResponse.status} ${basicResponse.statusText}`);
            
          } catch (proxyError) {
            console.error('❌ CORS Proxy Grundverbindung auch fehlgeschlagen:', proxyError);
            
            // Original error handling for CORS
            const corsError = basicError.toString().includes('CORS') || 
                             window.location.origin.includes('localhost') ||
                             window.location.origin.includes('127.0.0.1');
            
            if (corsError) {
              return {
                success: false,
                error: `🚫 CORS-Fehler: Server blockiert Browser-Anfragen.

🔧 Schnelle Lösungen:
• **App-Passwort**: Nextcloud → Einstellungen → Sicherheit
• **Desktop-App**: Keine CORS-Probleme  
• **CORS-Proxy**: Wird automatisch versucht (siehe Konsole)

💡 Tipp: Prüfen Sie die Browser-Konsole (F12) für Details.`
              };
            }
            
            return {
              success: false,
              error: 'Netzwerkfehler: Server nicht erreichbar. Prüfen Sie:\n• Server-URL korrekt (inkl. https://)\n• Internetverbindung\n• Firewall-Einstellungen\n• Server ist online'
            };
          }
        }
        
        return {
          success: false,
          error: `Grundverbindung fehlgeschlagen: ${basicError instanceof Error ? basicError.message : 'Unbekannter Fehler'}`
        };
      }

      // Step 2: Test CalDAV-specific endpoints
      console.log('🔐 Teste CalDAV-Authentifizierung...');
      
      // Try different CalDAV endpoints
      const caldavEndpoints = [
        '', // Root
        'remote.php/dav/', // Nextcloud standard
        'remote.php/caldav/', // Nextcloud CalDAV
        'dav/', // Generic DAV
        'caldav/', // Direct CalDAV
      ];

      for (const endpoint of caldavEndpoints) {
        try {
          console.log(`🔍 Teste Endpoint: ${endpoint}`);
          
          const response = await this.makeRequest('OPTIONS', endpoint, {
            method: 'OPTIONS',
            headers: this.getAuthHeaders(),
          });

          console.log(`📡 ${endpoint} Status:`, response.status, response.statusText);

          if (response.ok) {
            const davHeader = response.headers.get('DAV');
            const allowHeader = response.headers.get('Allow');
            
            console.log('✅ DAV Header:', davHeader);
            console.log('✅ Allow Header:', allowHeader);

            // Check for CalDAV support
            if (davHeader && (davHeader.includes('calendar-access') || davHeader.includes('1, 2'))) {
              return { success: true };
            }

            // Try PROPFIND as fallback
            try {
              const propfindResponse = await this.makeRequest('PROPFIND', endpoint, {
                method: 'PROPFIND',
                headers: {
                  ...this.getAuthHeaders(),
                  'Content-Type': 'application/xml',
                  'Depth': '0',
                },
                body: `<?xml version="1.0" encoding="utf-8"?>
                  <d:propfind xmlns:d="DAV:">
                    <d:prop>
                      <d:resourcetype/>
                    </d:prop>
                  </d:propfind>`,
              });

              console.log(`📡 PROPFIND ${endpoint} Status:`, propfindResponse.status);

              if (propfindResponse.ok) {
                return { success: true };
              }
            } catch (propfindError) {
              console.warn(`PROPFIND ${endpoint} fehlgeschlagen:`, propfindError);
            }
          } else {
            console.log(`❌ ${endpoint} fehlgeschlagen:`, response.status, response.statusText);
          }
        } catch (endpointError) {
          console.warn(`Endpoint ${endpoint} nicht erreichbar:`, endpointError);
        }
      }

      // If we reach here, no endpoint worked
      const isDevelopment = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1');
      
      let errorMessage = `CalDAV-Server nicht gefunden. Überprüfen Sie:
• Server-URL (z.B. https://nextcloud.example.com)
• CalDAV ist aktiviert
• Benutzername und Passwort sind korrekt
• Verwenden Sie ein App-Passwort für Nextcloud`;

      if (isDevelopment) {
        errorMessage += `

🔧 Entwicklungsumgebung erkannt:
• CORS-Proxy wird automatisch verwendet (siehe Browser-Konsole)
• Alternativ: Desktop-App verwenden (keine CORS-Probleme)
• Oder CORS-Browser-Erweiterung installieren`;
      }

      return {
        success: false,
        error: errorMessage
      };

    } catch (error) {
      console.error('❌ Verbindungstest komplett fehlgeschlagen:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Verbindungsfehler'
      };
    }
  }

  // Get available calendars - with direct URL support
  async getCalendars(): Promise<CalDAVCalendar[]> {
    try {
      console.log('🚀 Starting CalDAV calendar discovery...');
      
      // If user provided a direct calendar URL, use it first
      if (this.connection.calendarUrl && this.connection.calendarUrl.trim()) {
        console.log('📍 User provided direct calendar URL:', this.connection.calendarUrl);
        
        try {
          const directUrl = this.connection.calendarUrl.replace(this.connection.serverUrl, '');
          const response = await this.makeRequest('PROPFIND', directUrl, {
            method: 'PROPFIND',
            headers: {
              ...this.getAuthHeaders(),
              'Content-Type': 'application/xml',
              'Depth': '0',
            },
            body: `<?xml version="1.0" encoding="utf-8"?>
              <d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
                <d:prop>
                  <d:displayname/>
                  <d:resourcetype/>
                  <c:supported-calendar-component-set/>
                </d:prop>
              </d:propfind>`,
          });

          if (response.ok || response.status === 207) {
            const xml = await response.text();
            console.log('✅ Direct calendar URL worked! Creating calendar from URL...');
            
            // Extract calendar name from URL
            const urlParts = this.connection.calendarUrl.split('/');
            const calendarName = urlParts[urlParts.length - 2] || urlParts[urlParts.length - 1] || 'Mein Kalender';
            
            const directCalendar: CalDAVCalendar = {
              name: calendarName,
              displayName: calendarName.charAt(0).toUpperCase() + calendarName.slice(1),
              url: this.connection.calendarUrl,
              supportedComponents: ['VTODO'],
              description: 'Manuell eingegebener Kalender',
              todoCount: 0
            };

            // Get todo count
            const todoCount = await this.getTodoCount(directCalendar.url);
            directCalendar.todoCount = todoCount;

            console.log('📅 Direct calendar created:', directCalendar);
            return [directCalendar];
          }
        } catch (error) {
          console.warn('⚠️ Direct calendar URL failed, falling back to discovery:', error);
        }
      }
      
      // Fallback to automatic discovery
      console.log('🔍 Starting automatic calendar discovery...');
      const calendarEndpoints = [
        `remote.php/dav/calendars/users/${this.connection.username}/`, // Nextcloud standard user path
        `remote.php/caldav/calendars/users/${this.connection.username}/`, // Nextcloud alternative user path
        'remote.php/dav/', // Nextcloud root DAV - will discover user calendars
        `remote.php/dav/principals/users/${this.connection.username}/`, // Principal discovery
        'dav/calendars/', // Generic DAV
        'caldav/', // Direct CalDAV
        `calendars/${this.connection.username}/`, // Direct calendar path
        'calendars/', // Calendar root
        '', // Server root fallback
      ];

      const allFoundCalendars: CalDAVCalendar[] = [];
      const successfulEndpoints: string[] = [];
      let lastError: Error | null = null;

      // TEST ALL ENDPOINTS AND COLLECT ALL CALENDARS
      for (const endpoint of calendarEndpoints) {
        try {
          console.log(`🔍 Testing calendar endpoint: ${endpoint}`);
          
          // Try comprehensive PROPFIND first
          let response = await this.makeRequest('PROPFIND', endpoint, {
            method: 'PROPFIND',
            headers: {
              ...this.getAuthHeaders(),
              'Content-Type': 'application/xml',
              'Depth': '1',
            },
            body: `<?xml version="1.0" encoding="utf-8"?>
              <d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:ic="http://apple.com/ns/ical/">
                <d:prop>
                  <d:displayname/>
                  <d:resourcetype/>
                  <c:supported-calendar-component-set/>
                  <d:description/>
                  <ic:calendar-color/>
                  <c:calendar-description/>
                  <d:getlastmodified/>
                </d:prop>
              </d:propfind>`,
          });
          
          // If comprehensive fails, try simplified PROPFIND
          if (!response.ok && response.status !== 207) {
            console.log(`⚠️ Comprehensive PROPFIND failed with ${response.status}, trying simplified request`);
            response = await this.makeRequest('PROPFIND', endpoint, {
              method: 'PROPFIND',
              headers: {
                ...this.getAuthHeaders(),
                'Content-Type': 'application/xml',
                'Depth': '1',
              },
              body: `<?xml version="1.0" encoding="utf-8"?>
                <propfind xmlns="DAV:">
                  <prop>
                    <displayname/>
                    <resourcetype/>
                  </prop>
                </propfind>`,
            });
          }

          // CalDAV servers return 207 (Multi-Status) for successful operations
          if (response.ok || response.status === 207) {
            const xml = await response.text();
            console.log(`📨 Response status: ${response.status} for endpoint ${endpoint}`);
            console.log(`📄 XML length: ${xml.length} characters`);
            
            const foundCalendars = this.parseCalendarsFromXML(xml);
            
            if (foundCalendars.length > 0) {
              console.log(`✅ Found ${foundCalendars.length} calendars at ${endpoint}:`);
              foundCalendars.forEach(cal => console.log(`  📅 "${cal.displayName}" (${cal.url})`));
              
              // Add to our collection (we'll deduplicate later)
              allFoundCalendars.push(...foundCalendars);
              successfulEndpoints.push(endpoint);
              
              // Continue checking other endpoints instead of breaking!
            } else {
              console.log(`⚠️ No calendars found at ${endpoint}`);
            }
          } else {
            console.log(`❌ Failed to access ${endpoint}: ${response.status} ${response.statusText}`);
          }
        } catch (error) {
          console.warn(`❌ Calendar discovery failed for ${endpoint}:`, error);
          lastError = error instanceof Error ? error : new Error('Unknown error');
          // Continue to next endpoint instead of stopping
        }
      }

      // DEDUPLICATE CALENDARS by URL
      const uniqueCalendars = new Map<string, CalDAVCalendar>();
      
      allFoundCalendars.forEach(calendar => {
        const normalizedUrl = calendar.url.replace(/\/+$/, ''); // Remove trailing slashes
        if (!uniqueCalendars.has(normalizedUrl)) {
          uniqueCalendars.set(normalizedUrl, calendar);
        } else {
          // If we have a duplicate, keep the one with more information
          const existing = uniqueCalendars.get(normalizedUrl)!;
          if (calendar.description && !existing.description) {
            uniqueCalendars.set(normalizedUrl, calendar);
          }
        }
      });

      const finalCalendars = Array.from(uniqueCalendars.values());
      
      console.log(`🎯 Deduplication result: ${finalCalendars.length} unique calendars from ${allFoundCalendars.length} total`);
      
      // If no calendars found, create fallback calendars
      if (finalCalendars.length === 0 && successfulEndpoints.length > 0) {
        console.log(`💡 No calendars found but some endpoints responded - creating fallback calendars`);
        
        const fallbackCalendars: CalDAVCalendar[] = [
          {
            name: 'default',
            displayName: 'Standard Kalender',
            url: `${this.connection.serverUrl}/remote.php/dav/calendars/users/${this.connection.username}/default/`,
            supportedComponents: ['VTODO'],
            description: 'Automatisch erstellter Standard-Kalender',
            todoCount: 0
          },
          {
            name: 'tasks',
            displayName: 'Aufgaben',
            url: `${this.connection.serverUrl}/remote.php/dav/calendars/users/${this.connection.username}/tasks/`,
            supportedComponents: ['VTODO'],
            description: 'Automatisch erstellter Aufgaben-Kalender',
            todoCount: 0
          },
          {
            name: 'personal',
            displayName: 'Persönlicher Kalender',
            url: `${this.connection.serverUrl}/remote.php/dav/calendars/users/${this.connection.username}/personal/`,
            supportedComponents: ['VTODO'],
            description: 'Automatisch erstellter persönlicher Kalender',
            todoCount: 0
          }
        ];
        
        finalCalendars.push(...fallbackCalendars);
        console.log(`✅ Added ${fallbackCalendars.length} fallback calendars`);
      }
      
      // Add todo count for each calendar
      console.log(`📊 Getting todo counts for ${finalCalendars.length} calendars...`);
      for (const calendar of finalCalendars) {
        try {
          const todoCount = await this.getTodoCount(calendar.url);
          calendar.todoCount = todoCount;
          console.log(`📋 Calendar "${calendar.displayName}": ${todoCount} todos`);
        } catch (error) {
          console.warn(`Failed to get todo count for calendar ${calendar.name}:`, error);
          calendar.todoCount = 0;
        }
      }
      
      // Final diagnosis
      console.log(`📊 FINAL CALENDAR DISCOVERY RESULT:`);
      console.log(`  🎯 Found ${finalCalendars.length} calendars total`);
      console.log(`  ✅ Successful endpoints: ${successfulEndpoints.length}/${calendarEndpoints.length}`);
      finalCalendars.forEach((cal, index) => {
        console.log(`  📅 ${index + 1}. "${cal.displayName}" (${cal.todoCount} todos) - ${cal.url}`);
      });

      if (finalCalendars.length === 0) {
        console.log(`🔍 DIAGNOSIS: No calendars found at any endpoint`);
        console.log(`📋 Tried endpoints:`, calendarEndpoints.map(ep => `${this.connection.serverUrl}${ep}`));
        console.log(`🔧 SUGGESTIONS:`);
        console.log(`  1. Check if calendar app is enabled in Nextcloud`);
        console.log(`  2. Create at least one calendar in Nextcloud`);
        console.log(`  3. Verify the CalDAV URL is correct`);
        console.log(`  4. Check browser console for detailed XML responses`);
        throw lastError || new Error('No calendars found at any endpoint');
      }

      return finalCalendars;
    } catch (error) {
      console.error('❌ CRITICAL ERROR in calendar discovery:', error);
      console.log(`🔍 CalDAV Calendar Discovery Debug Information:`);
      console.log(`  Server URL: ${this.connection.serverUrl}`);
      console.log(`  Username: ${this.connection.username}`);
      console.log(`  Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  // Get todo count for a specific calendar
  async getTodoCount(calendarUrl: string): Promise<number> {
    try {
      const response = await this.makeRequest('REPORT', calendarUrl, {
        method: 'REPORT',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/xml',
          'Depth': '1',
        },
        body: `<?xml version="1.0" encoding="utf-8"?>
          <c:calendar-query xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:d="DAV:">
            <d:prop>
              <d:getetag/>
            </d:prop>
            <c:filter>
              <c:comp-filter name="VCALENDAR">
                <c:comp-filter name="VTODO"/>
              </c:comp-filter>
            </c:filter>
          </c:calendar-query>`,
      });

      if (!response.ok) {
        return 0;
      }

      const xml = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'text/xml');
      const responses = doc.querySelectorAll('response');
      
      return responses.length;
    } catch (error) {
      console.error('Error getting todo count:', error);
      return 0;
    }
  }

  // Get all todos from CalDAV
  async getTodos(): Promise<CalDAVTodo[]> {
    try {
      const calendarUrl = this.connection.calendarUrl || `${this.connection.serverUrl}/calendars/${this.connection.username}/tasks/`;
      
      const response = await this.makeRequest('REPORT', calendarUrl, {
        method: 'REPORT',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/xml',
          'Depth': '1',
        },
        body: `<?xml version="1.0" encoding="utf-8"?>
          <c:calendar-query xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:d="DAV:">
            <d:prop>
              <d:getetag/>
              <c:calendar-data/>
            </d:prop>
            <c:filter>
              <c:comp-filter name="VCALENDAR">
                <c:comp-filter name="VTODO"/>
              </c:comp-filter>
            </c:filter>
          </c:calendar-query>`,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch todos: ${response.status}`);
      }

      const xml = await response.text();
      return this.parseTodosFromXML(xml);
    } catch (error) {
      console.error('Error fetching todos:', error);
      throw error;
    }
  }

  // Create a new todo with intelligent UID handling
  async createTodo(todo: CalDAVTodo): Promise<string> {
    try {
      console.log('🚀 Creating CalDAV Todo:', todo.uid);
      
      const calendarUrl = this.connection.calendarUrl || `${this.connection.serverUrl}/calendars/${this.connection.username}/tasks/`;
      
      // Ensure unique UID with timestamp
      const baseUid = todo.uid;
      let attemptUid = baseUid;
      let attempt = 0;
      let lastError: Error | null = null;
      
      // Try up to 5 times with different UIDs
      while (attempt < 5) {
        try {
          const todoUrl = `${calendarUrl}${attemptUid}.ics`;
          console.log(`📡 Attempt ${attempt + 1}: Creating todo at ${todoUrl}`);
          
          const icalData = this.todoToICalendar({ ...todo, uid: attemptUid });
          
          const response = await this.makeRequest('PUT', todoUrl, {
            method: 'PUT',
            headers: {
              ...this.getAuthHeaders(),
              'Content-Type': 'text/calendar',
              'If-None-Match': '*', // Only create if doesn't exist
            },
            body: icalData,
          });

          if (response.ok) {
            console.log('✅ Todo created successfully with UID:', attemptUid);
            const etag = response.headers.get('ETag');
            
            // Update the original todo object with the successful UID
            todo.uid = attemptUid;
            
            return etag || '';
          } else if (response.status === 412) {
            // UID already exists, try with modified UID
            console.log(`⚠️ UID conflict (412) for ${attemptUid}, trying another...`);
            attempt++;
            const timestamp = Date.now();
            attemptUid = `${baseUid}-${timestamp}-${attempt}`;
            continue;
          } else {
            throw new Error(`Failed to create todo: ${response.status} ${response.statusText}`);
          }
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error');
          if (error instanceof Error && error.message.includes('412')) {
            // Retry with new UID
            attempt++;
            const timestamp = Date.now();
            attemptUid = `${baseUid}-${timestamp}-${attempt}`;
            console.log(`🔄 Retrying with new UID: ${attemptUid}`);
            continue;
          } else {
            throw error;
          }
        }
      }
      
      throw lastError || new Error(`Failed to create todo after ${attempt} attempts: UID conflicts`);
      
    } catch (error) {
      console.error('❌ Error creating todo:', error);
      throw error;
    }
  }

  // Update an existing todo
  async updateTodo(todo: CalDAVTodo): Promise<string> {
    try {
      const todoUrl = todo.url || `${this.connection.calendarUrl || `${this.connection.serverUrl}/calendars/${this.connection.username}/tasks/`}${todo.uid}.ics`;
      
      const icalData = this.todoToICalendar(todo);
      
      const response = await this.makeRequest('PUT', todoUrl, {
        method: 'PUT',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'text/calendar',
          ...(todo.etag && { 'If-Match': todo.etag }),
        },
        body: icalData,
      });

      if (!response.ok) {
        throw new Error(`Failed to update todo: ${response.status}`);
      }

      const etag = response.headers.get('ETag');
      return etag || '';
    } catch (error) {
      console.error('Error updating todo:', error);
      throw error;
    }
  }

  // Delete a todo
  async deleteTodo(todoUid: string, etag?: string): Promise<void> {
    try {
      const calendarUrl = this.connection.calendarUrl || `${this.connection.serverUrl}/calendars/${this.connection.username}/tasks/`;
      const todoUrl = `${calendarUrl}${todoUid}.ics`;
      
      const response = await this.makeRequest('DELETE', todoUrl, {
        method: 'DELETE',
        headers: {
          ...this.getAuthHeaders(),
          ...(etag && { 'If-Match': etag }),
        },
      });

      if (!response.ok && response.status !== 404) {
        throw new Error(`Failed to delete todo: ${response.status}`);
      }
    } catch (error) {
      console.error('Error deleting todo:', error);
      throw error;
    }
  }

  // Sync tasks with CalDAV
  async syncTasks(localTasks: Task[], options: CalDAVSyncOptions = {}): Promise<CalDAVSyncResult> {
    if (this.syncInProgress) {
      throw new Error('Synchronisation bereits in Bearbeitung');
    }

    this.syncInProgress = true;
    const result: CalDAVSyncResult = {
      success: false,
      added: 0,
      updated: 0,
      deleted: 0,
      conflicts: [],
      errors: [],
    };

    try {
      options.onProgress?.(10, 'Verbindung zu CalDAV-Server...');
      
      // Get remote todos
      const remoteTodos = await this.getTodos();
      options.onProgress?.(30, 'Remote-Aufgaben geladen...');

      // Create maps for easier lookup
      const localTaskMap = new Map(localTasks.map(task => [task.caldavUid || task.id, task]));
      const remoteTodoMap = new Map(remoteTodos.map(todo => [todo.uid, todo]));

      options.onProgress?.(50, 'Synchronisation wird durchgeführt...');

      // Process remote todos
      for (const remoteTodo of remoteTodos) {
        const localTask = localTaskMap.get(remoteTodo.uid);
        
        if (!localTask) {
          // New remote todo - create local task
          result.added++;
        } else {
          // Check for conflicts
          const localModified = new Date(localTask.updatedAt).getTime();
          const remoteModified = new Date(remoteTodo['last-modified']).getTime();
          
          if (localModified > remoteModified) {
            // Local is newer - update remote
            await this.updateTodo(this.taskToCalDAVTodo(localTask));
            result.updated++;
          } else if (remoteModified > localModified) {
            // Remote is newer - update local
            result.updated++;
          }
        }
      }

      // Process local tasks
      for (const localTask of localTasks) {
        if (!localTask.caldavUid) {
          // New local task - create remote todo
          const caldavTodo = this.taskToCalDAVTodo(localTask);
          const etag = await this.createTodo(caldavTodo);
          result.added++;
        }
      }

      options.onProgress?.(90, 'Synchronisation abgeschlossen...');
      
      result.success = true;
      options.onProgress?.(100, 'Fertig!');
      
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unbekannter Fehler');
      console.error('Sync error:', error);
    } finally {
      this.syncInProgress = false;
    }

    return result;
  }

  // Helper methods
  private async makeRequest(method: string, url: string, options: RequestInit): Promise<Response> {
    // Properly join base URL and path, avoiding double slashes
    const fullUrl = url.startsWith('http') ? url : `${this.connection.serverUrl.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
    
    try {
      console.log(`CalDAV Request: ${method} ${fullUrl}`);
      
      // Try direct request first
      const response = await fetch(fullUrl, {
        ...options,
        method,
        // Add timeout and other fetch options
        signal: AbortSignal.timeout(30000), // 30 second timeout
        mode: 'cors',
        credentials: 'include',
      });
      
      console.log(`CalDAV Response: ${response.status} ${response.statusText}`);
      
      return response;
    } catch (error) {
      console.error('CalDAV Request failed:', error);
      
      // If direct request fails and we're in development, try CORS proxy
      if (corsProxy.isDevelopmentMode() && error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.log('🔄 Trying CORS proxy as fallback...');
        
        try {
          corsProxy.showProxyWarning();
          
          const proxyResponse = await corsProxy.fetchWithProxy(fullUrl, {
            ...options,
            method,
            signal: AbortSignal.timeout(30000),
            mode: 'cors',
            credentials: 'include',
          });
          
          console.log(`✅ CORS Proxy successful: ${proxyResponse.status} ${proxyResponse.statusText}`);
          console.log(`🎉 CalDAV funktioniert über CORS-Proxy! (${method} ${url})`);
          return proxyResponse;
        } catch (proxyError) {
          console.error('❌ CORS Proxy also failed:', proxyError);
          console.log('💡 Tipp: Versuchen Sie die Desktop-App für direkte CalDAV-Verbindungen.');
          // Fall through to original error handling
        }
      }
      
      // Provide more specific error messages
      if (error instanceof TypeError) {
        if (error.message.includes('Failed to fetch')) {
          throw new Error('Verbindung zum CalDAV-Server fehlgeschlagen. Überprüfen Sie die Server-URL und Ihre Internetverbindung.');
        } else if (error.message.includes('NetworkError')) {
          throw new Error('Netzwerkfehler: Überprüfen Sie Ihre Internetverbindung und Firewall-Einstellungen.');
        } else if (error.message.includes('CORS')) {
          throw new Error('CORS-Fehler: Der CalDAV-Server blockiert Anfragen aus dem Browser. Möglicherweise ist eine Proxy-Konfiguration erforderlich.');
        }
      }
      
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('Timeout: Die Anfrage an den CalDAV-Server hat zu lange gedauert.');
      }
      
      // Generic error fallback
      throw new Error(`Netzwerkfehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }

  private getAuthHeaders(): Record<string, string> {
    const credentials = btoa(`${this.connection.username}:${this.connection.password}`);
    return {
      'Authorization': `Basic ${credentials}`,
    };
  }

  private parseCalendarsFromXML(xml: string): CalDAVCalendar[] {
    const calendars: CalDAVCalendar[] = [];
    
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'text/xml');
      
      // ENHANCED DEBUG: Log the complete XML response
      console.log('🔍 COMPLETE CalDAV XML Response:');
      console.log(xml);
      console.log('🔍 XML Response length:', xml.length, 'characters');
      
      // Check for parsing errors
      const parserError = doc.querySelector('parsererror');
      if (parserError) {
        console.error('❌ XML Parser Error:', parserError.textContent);
        return calendars;
      }
      
      // Try multiple response selectors with extensive debugging
      const possibleSelectors = [
        'response',
        'd\\:response', 
        'D\\:response',
        '*|response',
        '[*|localName="response"]'
      ];
      
      let responses: NodeListOf<Element> | null = null;
      let usedSelector = '';
      
      for (const selector of possibleSelectors) {
        const found = doc.querySelectorAll(selector);
        if (found.length > 0) {
          responses = found;
          usedSelector = selector;
          console.log(`✅ Found ${found.length} responses using selector: "${selector}"`);
          break;
        } else {
          console.log(`❌ No responses found with selector: "${selector}"`);
        }
      }
      
      if (!responses || responses.length === 0) {
        console.log('🔍 No response elements found - checking document structure:');
        console.log('Root element:', doc.documentElement?.tagName);
        console.log('Root element namespace:', doc.documentElement?.namespaceURI);
        console.log('All element names in document:', Array.from(doc.querySelectorAll('*')).map(el => el.tagName).slice(0, 20));
        return calendars;
      }
      
      console.log(`📊 Processing ${responses.length} calendar responses with selector: ${usedSelector}`);
      
      responses.forEach((response, index) => {
        console.log(`\n📋 === Processing Calendar Response ${index + 1} ===`);
        
        // Enhanced property extraction with multiple namespace attempts
        const hrefSelectors = ['href', 'd\\:href', 'D\\:href', '*|href'];
        const displayNameSelectors = ['displayname', 'd\\:displayname', 'D\\:displayname', '*|displayname'];
        const resourceTypeSelectors = ['resourcetype', 'd\\:resourcetype', 'D\\:resourcetype', '*|resourcetype'];
        
        let href = '';
        let displayName = '';
        let resourceType: Element | null = null;
        
        // Find href
        for (const selector of hrefSelectors) {
          const element = response.querySelector(selector);
          if (element?.textContent?.trim()) {
            href = element.textContent.trim();
            console.log(`  📍 Found href with "${selector}": ${href}`);
            break;
          }
        }
        
        // Find displayName
        for (const selector of displayNameSelectors) {
          const element = response.querySelector(selector);
          if (element?.textContent?.trim()) {
            displayName = element.textContent.trim();
            console.log(`  📛 Found displayName with "${selector}": ${displayName}`);
            break;
          }
        }
        
        // Find resourceType
        for (const selector of resourceTypeSelectors) {
          const element = response.querySelector(selector);
          if (element) {
            resourceType = element;
            console.log(`  🏷️ Found resourceType with "${selector}"`);
            break;
          }
        }
        
        console.log(`  📊 Extracted: href="${href}", displayName="${displayName}", hasResourceType=${!!resourceType}`);
        
        // Log the complete response XML for debugging
        console.log(`  🔍 Complete response XML:`, response.outerHTML);
        
        if (!href || !displayName) {
          console.log(`  ❌ Skipping - missing href (${!!href}) or displayName (${!!displayName})`);
          return;
        }
        
        // Enhanced calendar detection
        let hasCollection = false;
        let hasCalendar = false;
        
        if (resourceType) {
          const collectionSelectors = ['collection', 'd\\:collection', 'D\\:collection', '*|collection'];
          const calendarSelectors = ['calendar', 'c\\:calendar', 'C\\:calendar', '*|calendar'];
          
          for (const selector of collectionSelectors) {
            if (resourceType.querySelector(selector)) {
              hasCollection = true;
              console.log(`  ✅ Found collection with selector: ${selector}`);
              break;
            }
          }
          
          for (const selector of calendarSelectors) {
            if (resourceType.querySelector(selector)) {
              hasCalendar = true;
              console.log(`  ✅ Found calendar with selector: ${selector}`);
              break;
            }
          }
        }
        
        // Path-based calendar detection
        const hrefSuggestsCalendar = href && (
          href.includes('/calendars/') || 
          href.includes('/calendar/') ||
          href.includes('/caldav/') ||
          (href.endsWith('/') && !href.includes('/principals/'))
        );
        
        console.log(`  🔍 Calendar detection: hasCollection=${hasCollection}, hasCalendar=${hasCalendar}, hrefSuggestsCalendar=${hrefSuggestsCalendar}`);
        
        // ENHANCED calendar detection with detailed logging
        const isPrincipal = href.includes('/principals/') || 
                           displayName.includes('calendar-proxy') || 
                           href.includes('/principal') ||
                           href.endsWith('/current-user-principal') ||
                           href.endsWith('/calendar-proxy-read/') ||
                           href.endsWith('/calendar-proxy-write/');
        
        // More relaxed calendar detection for real calendars
        const isCalendar = !isPrincipal && (
          (hasCollection && hasCalendar) || // Perfect match: collection + calendar
          (hasCollection && hrefSuggestsCalendar) || // Collection in calendar path
          hrefSuggestsCalendar || // Path suggests calendar (but not principal)
          (hasCollection && !href.includes('/principals/')) // Any collection not in principals
        );
        
        console.log(`  📊 DETAILED ANALYSIS for "${displayName}":`);
        console.log(`    📍 href: ${href}`);
        console.log(`    🔍 isPrincipal: ${isPrincipal}`);
        console.log(`      - href.includes('/principals/'): ${href.includes('/principals/')}`);
        console.log(`      - displayName.includes('calendar-proxy'): ${displayName.includes('calendar-proxy')}`);
        console.log(`    📅 Calendar indicators:`);
        console.log(`      - hasCollection: ${hasCollection}`);
        console.log(`      - hasCalendar: ${hasCalendar}`);
        console.log(`      - hrefSuggestsCalendar: ${hrefSuggestsCalendar}`);
        console.log(`    🎯 FINAL RESULT: isCalendar=${isCalendar}`);
        
        if (isCalendar) {
          // ASSUME ALL CALENDARS SUPPORT TODOS (most do)
          console.log(`  ✅ Assuming "${displayName}" supports todos (common for most CalDAV servers)`);
          
          // Extract additional properties
          const description = response.querySelector('description, d\\:description, c\\:calendar-description')?.textContent || '';
          const color = response.querySelector('calendar-color, ic\\:calendar-color')?.textContent || '';
          const lastModified = response.querySelector('getlastmodified, d\\:getlastmodified')?.textContent || '';
          
          // Ensure URL is absolute
          let absoluteUrl = href;
          if (href.startsWith('/')) {
            absoluteUrl = this.connection.serverUrl + href;
          } else if (!href.startsWith('http')) {
            absoluteUrl = this.connection.serverUrl + '/' + href;
          }
          
          const calendar: CalDAVCalendar = {
            name: href.split('/').filter(p => p).pop() || displayName.toLowerCase().replace(/\s+/g, '-'),
            displayName,
            url: absoluteUrl,
            supportedComponents: ['VTODO'],
            description,
            color,
            lastModified,
          };
          
          calendars.push(calendar);
          console.log(`  📅 ✅ ADDED CALENDAR:`, calendar);
        } else {
          console.log(`  ❌ SKIPPED non-calendar resource: "${displayName}"`);
        }
      });
      
      console.log(`\n🎯 PARSING RESULT: Found ${calendars.length} calendars with todo support`);
      calendars.forEach((cal, index) => {
        console.log(`  📅 ${index + 1}. "${cal.displayName}" - ${cal.url}`);
      });
      
    } catch (error) {
      console.error('❌ CRITICAL ERROR parsing calendars XML:', error);
      console.error('🔍 Full XML that caused the error:');
      console.error(xml);
    }
    
    return calendars;
  }

  private parseTodosFromXML(xml: string): CalDAVTodo[] {
    const todos: CalDAVTodo[] = [];
    
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'text/xml');
      const responses = doc.querySelectorAll('response');
      
      responses.forEach(response => {
        const href = response.querySelector('href')?.textContent;
        const etag = response.querySelector('getetag')?.textContent;
        const calendarData = response.querySelector('calendar-data')?.textContent;
        
        if (href && calendarData) {
          const todo = this.parseICalendarToTodo(calendarData);
          if (todo) {
            todo.etag = etag || '';
            todo.url = href;
            todos.push(todo);
          }
        }
      });
    } catch (error) {
      console.error('Error parsing todos XML:', error);
    }
    
    return todos;
  }

  private parseICalendarToTodo(icalData: string): CalDAVTodo | null {
    try {
      const lines = icalData.split('\n').map(line => line.trim());
      const todo: Partial<CalDAVTodo> = {};
      
      for (const line of lines) {
        if (line.startsWith('UID:')) {
          todo.uid = line.substring(4);
        } else if (line.startsWith('SUMMARY:')) {
          todo.summary = line.substring(8);
        } else if (line.startsWith('DESCRIPTION:')) {
          todo.description = line.substring(12);
        } else if (line.startsWith('STATUS:')) {
          todo.status = line.substring(7) as CalDAVTodo['status'];
        } else if (line.startsWith('PRIORITY:')) {
          todo.priority = parseInt(line.substring(9)) || undefined;
        } else if (line.startsWith('DUE:')) {
          todo.due = this.parseICalendarDate(line.substring(4));
        } else if (line.startsWith('DTSTART:')) {
          todo.dtstart = this.parseICalendarDate(line.substring(8));
        } else if (line.startsWith('CREATED:')) {
          todo.created = this.parseICalendarDate(line.substring(8));
        } else if (line.startsWith('LAST-MODIFIED:')) {
          todo['last-modified'] = this.parseICalendarDate(line.substring(14));
        } else if (line.startsWith('CATEGORIES:')) {
          todo.categories = line.substring(11).split(',').map(cat => cat.trim());
        } else if (line.startsWith('PERCENT-COMPLETE:')) {
          todo.percent_complete = parseInt(line.substring(17)) || 0;
        }
      }
      
      if (todo.uid && todo.summary) {
        todo.completed = todo.status === 'COMPLETED' || todo.percent_complete === 100;
        return todo as CalDAVTodo;
      }
      
      return null;
    } catch (error) {
      console.error('Error parsing iCalendar data:', error);
      return null;
    }
  }

  private todoToICalendar(todo: CalDAVTodo): string {
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    let ical = 'BEGIN:VCALENDAR\n';
    ical += 'VERSION:2.0\n';
    ical += 'PRODID:-//TaskFuchs//TaskFuchs//EN\n';
    ical += 'BEGIN:VTODO\n';
    ical += `UID:${todo.uid}\n`;
    ical += `SUMMARY:${todo.summary}\n`;
    
    if (todo.description) {
      ical += `DESCRIPTION:${todo.description}\n`;
    }
    
    if (todo.priority) {
      ical += `PRIORITY:${todo.priority}\n`;
    }
    
    if (todo.due) {
      ical += `DUE:${this.formatICalendarDate(todo.due)}\n`;
    }
    
    if (todo.dtstart) {
      ical += `DTSTART:${this.formatICalendarDate(todo.dtstart)}\n`;
    }
    
    if (todo.categories && todo.categories.length > 0) {
      ical += `CATEGORIES:${todo.categories.join(',')}\n`;
    }
    
    if (todo.completed) {
      ical += 'STATUS:COMPLETED\n';
      ical += 'PERCENT-COMPLETE:100\n';
    } else {
      ical += 'STATUS:NEEDS-ACTION\n';
      ical += `PERCENT-COMPLETE:${todo.percent_complete || 0}\n`;
    }
    
    ical += `CREATED:${this.formatICalendarDate(todo.created)}\n`;
    ical += `LAST-MODIFIED:${this.formatICalendarDate(todo['last-modified'])}\n`;
    ical += `DTSTAMP:${now}\n`;
    ical += 'END:VTODO\n';
    ical += 'END:VCALENDAR\n';
    
    return ical;
  }

  private taskToCalDAVTodo(task: Task): CalDAVTodo {
    const priorityMap = {
      'none': 0,
      'low': 7,
      'medium': 5,
      'high': 1,
    };

    return {
      uid: task.caldavUid || task.id,
      summary: task.title,
      description: task.description,
      completed: task.completed,
      priority: priorityMap[task.priority || 'none'],
      due: task.reminderDate,
      created: task.createdAt,
      'last-modified': task.updatedAt,
      status: task.completed ? 'COMPLETED' : 'NEEDS-ACTION',
      categories: task.tags,
      percent_complete: task.completed ? 100 : 0,
    };
  }

  private caldavTodoToTask(todo: CalDAVTodo): Partial<Task> {
    const priorityMap = {
      1: 'high',
      2: 'high',
      3: 'high',
      4: 'medium',
      5: 'medium',
      6: 'medium',
      7: 'low',
      8: 'low',
      9: 'low',
    };

    return {
      id: todo.uid,
      title: todo.summary,
      description: todo.description,
      completed: todo.completed || false,
      priority: priorityMap[todo.priority || 0] || 'none',
      reminderDate: todo.due,
      tags: todo.categories || [],
      createdAt: todo.created,
      updatedAt: todo['last-modified'],
      caldavUid: todo.uid,
      caldavEtag: todo.etag,
      caldavUrl: todo.url,
      caldavLastSync: new Date().toISOString(),
      caldavSyncStatus: 'synced',
    };
  }

  private parseICalendarDate(dateStr: string): string {
    try {
      // Handle both DATE and DATE-TIME formats
      if (dateStr.includes('T')) {
        // DATE-TIME format
        const date = new Date(dateStr.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?/, '$1-$2-$3T$4:$5:$6Z'));
        return date.toISOString();
      } else {
        // DATE format
        const date = new Date(dateStr.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
        return date.toISOString();
      }
    } catch (error) {
      console.error('Error parsing iCalendar date:', error);
      return new Date().toISOString();
    }
  }

  private formatICalendarDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    } catch (error) {
      console.error('Error formatting iCalendar date:', error);
      return new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    }
  }
}

// Export singleton instance
let caldavServiceInstance: CalDAVService | null = null;

export function getCalDAVService(connection?: CalDAVConnection): CalDAVService {
  if (!caldavServiceInstance && connection) {
    caldavServiceInstance = new CalDAVService(connection);
  } else if (caldavServiceInstance && connection) {
    caldavServiceInstance.updateConnection(connection);
  }
  
  if (!caldavServiceInstance) {
    throw new Error('CalDAV service not initialized');
  }
  
  return caldavServiceInstance;
}

export function resetCalDAVService(): void {
  caldavServiceInstance = null;
}

// Export auto-sync manager
export const caldavAutoSyncManager = CalDAVAutoSyncManager.getInstance();