// Toggl Track API integration service
import { UserPreferences } from '../types';

export interface TogglTimeEntry {
  id: number;
  description: string;
  start: string;
  stop?: string;
  duration: number;
  project_id?: number;
  workspace_id: number;
  tags?: string[];
  created_with: string;
}

export interface TogglProject {
  id: number;
  name: string;
  workspace_id: number;
  client_id?: number;
  active: boolean;
  color: string;
}

export interface TogglWorkspace {
  id: number;
  name: string;
  organization_id: number;
}

export interface TogglApiError {
  error: string;
  message: string;
  status: number;
}

class TogglService {
  private baseUrl = 'https://api.track.toggl.com/api/v9';
  private preferences: UserPreferences | null = null;

  constructor() {
    this.loadPreferences();
  }

  private loadPreferences() {
    try {
      const saved = localStorage.getItem('taskfuchs-preferences');
      if (saved) {
        this.preferences = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load preferences for Toggl service:', error);
    }
  }

  updatePreferences(preferences: UserPreferences) {
    this.preferences = preferences;
  }

  private getHeaders(): Record<string, string> {
    if (!this.preferences?.toggl?.apiToken) {
      throw new Error('Toggl API token not configured');
    }

    return {
      'Authorization': `Basic ${btoa(this.preferences.toggl.apiToken + ':api_token')}`,
      'Content-Type': 'application/json',
    };
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.preferences?.toggl?.enabled) {
      throw new Error('Toggl integration is not enabled');
    }

    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Toggl API error: ${response.status} ${response.statusText}${
            errorData.error ? ` - ${errorData.error}` : ''
          }`
        );
      }

      return response.json();
    } catch (error) {
      // Handle CORS and network errors
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error('Verbindung zur Toggl API fehlgeschlagen. Dies kann aufgrund von CORS-Einschränkungen auftreten. Die Toggl-Integration funktioniert möglicherweise nur in der Desktop-Version der App.');
      }
      
      // Re-throw other errors
      throw error;
    }
  }

  // Get user workspaces
  async getWorkspaces(): Promise<TogglWorkspace[]> {
    return this.makeRequest<TogglWorkspace[]>('/workspaces');
  }

  // Get user workspaces (for testing purposes)
  async getWorkspacesForTest(): Promise<TogglWorkspace[]> {
    return this.makeTestRequest<TogglWorkspace[]>('/workspaces');
  }

  // Get projects for a workspace
  async getProjects(workspaceId: number): Promise<TogglProject[]> {
    return this.makeRequest<TogglProject[]>(`/workspaces/${workspaceId}/projects`);
  }

  // Get projects for a workspace (for testing purposes)
  async getProjectsForTest(workspaceId: number): Promise<TogglProject[]> {
    return this.makeTestRequest<TogglProject[]>(`/workspaces/${workspaceId}/projects`);
  }

  // Create a new project
  async createProject(
    workspaceId: number,
    name: string,
    color?: string
  ): Promise<TogglProject> {
    return this.makeRequest<TogglProject>(`/workspaces/${workspaceId}/projects`, {
      method: 'POST',
      body: JSON.stringify({
        name,
        color: color || '#3750db',
        active: true,
      }),
    });
  }

  // Start a time entry
  async startTimeEntry(
    workspaceId: number,
    description: string,
    projectId?: number,
    tags?: string[]
  ): Promise<TogglTimeEntry> {
    const timeEntry = {
      description,
      start: new Date().toISOString(),
      workspace_id: workspaceId,
      project_id: projectId,
      tags: tags || [],
      created_with: 'TaskFuchs',
      duration: -1, // ✅ FIX: -1 für laufende Timer (gemäß offizieller API-Dokumentation)
      stop: null,    // ✅ FIX: Explizit null für laufende Timer
      billable: false // ✅ FIX: Standard-Wert für Billable
    };

    console.log('🔵 Toggl Timer Start:', { workspaceId, description, projectId, tags });

    return this.makeRequest<TogglTimeEntry>(`/workspaces/${workspaceId}/time_entries`, {
      method: 'POST',
      body: JSON.stringify(timeEntry),
    });
  }

  // Stop a time entry
  async stopTimeEntry(workspaceId: number, timeEntryId: number): Promise<TogglTimeEntry> {
    return this.makeRequest<TogglTimeEntry>(
      `/workspaces/${workspaceId}/time_entries/${timeEntryId}/stop`,
      {
        method: 'PATCH',
      }
    );
  }

  // Update a time entry
  async updateTimeEntry(
    workspaceId: number,
    timeEntryId: number,
    updates: Partial<TogglTimeEntry>
  ): Promise<TogglTimeEntry> {
    return this.makeRequest<TogglTimeEntry>(
      `/workspaces/${workspaceId}/time_entries/${timeEntryId}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates),
      }
    );
  }

  // Get current running time entry
  async getCurrentTimeEntry(): Promise<TogglTimeEntry | null> {
    if (!this.preferences?.toggl?.workspaceId) {
      throw new Error('Workspace ID not configured');
    }

    const current = await this.makeRequest<TogglTimeEntry>(
      `/workspaces/${this.preferences.toggl.workspaceId}/time_entries/current`
    );

    return current || null;
  }

  // Test API connection (bypasses enabled check)
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const workspaces = await this.makeTestRequest<TogglWorkspace[]>('/workspaces');
      return {
        success: true,
        message: `Erfolgreich verbunden! ${workspaces.length} Workspace(s) gefunden.`,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Verbindungstest fehlgeschlagen',
      };
    }
  }

  // ✅ NEW: Comprehensive Toggl diagnostics
  async runDiagnostics(): Promise<{
    connection: { success: boolean; message: string };
    config: { valid: boolean; issues: string[] };
    permissions: { valid: boolean; message: string };
    recommendations: string[];
  }> {
    const diagnostics = {
      connection: { success: false, message: '' },
      config: { valid: false, issues: [] as string[] },
      permissions: { valid: false, message: '' },
      recommendations: [] as string[]
    };

    // 1. Test basic configuration
    const configIssues: string[] = [];
    if (!this.preferences?.toggl?.apiToken) {
      configIssues.push('API-Token fehlt');
    }
    if (!this.preferences?.toggl?.workspaceId) {
      configIssues.push('Workspace-ID fehlt');
    }
    if (!this.preferences?.toggl?.enabled) {
      configIssues.push('Integration ist deaktiviert');
    }

    diagnostics.config = {
      valid: configIssues.length === 0,
      issues: configIssues
    };

    // 2. Test API connection
    try {
      diagnostics.connection = await this.testConnection();
    } catch (error) {
      diagnostics.connection = {
        success: false,
        message: error instanceof Error ? error.message : 'Verbindungstest fehlgeschlagen'
      };
    }

    // 3. Test permissions (if connection successful)
    if (diagnostics.connection.success && this.preferences?.toggl?.workspaceId) {
      try {
        const workspaceId = parseInt(this.preferences.toggl.workspaceId);
        const projects = await this.getProjectsForTest(workspaceId);
        diagnostics.permissions = {
          valid: true,
          message: `Workspace-Zugriff OK, ${projects.length} Projekte gefunden`
        };
      } catch (error) {
        diagnostics.permissions = {
          valid: false,
          message: error instanceof Error ? error.message : 'Workspace-Zugriff fehlgeschlagen'
        };
      }
    }

    // 4. Generate recommendations
    const recommendations: string[] = [];
    
    if (!diagnostics.connection.success) {
      if (diagnostics.connection.message.includes('CORS')) {
        recommendations.push('🖥️ Verwenden Sie die Desktop-Version für volle Toggl-Kompatibilität');
        recommendations.push('🌐 Browser-CORS-Einschränkungen verhindern API-Zugriff');
      }
      if (diagnostics.connection.message.includes('401') || diagnostics.connection.message.includes('403')) {
        recommendations.push('🔑 Überprüfen Sie Ihren Toggl API-Token in den Toggl-Einstellungen');
        recommendations.push('📝 Neuen API-Token in Toggl Track generieren: Profile → API Token');
      }
    }

    if (!diagnostics.config.valid) {
      recommendations.push('⚙️ Vervollständigen Sie die Toggl-Konfiguration in den Einstellungen');
    }

    if (!diagnostics.permissions.valid && diagnostics.connection.success) {
      recommendations.push('👥 Überprüfen Sie Ihre Workspace-Berechtigung in Toggl Track');
    }

    if (diagnostics.connection.success && diagnostics.config.valid && diagnostics.permissions.valid) {
      recommendations.push('✅ Toggl-Integration ist vollständig konfiguriert und funktionsbereit');
      recommendations.push('🚀 Timer sollten automatisch in Toggl Track erscheinen');
    }

    diagnostics.recommendations = recommendations;
    return diagnostics;
  }

  // Special request method for testing that bypasses enabled check
  private async makeTestRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.preferences?.toggl?.apiToken) {
      throw new Error('Kein API-Token konfiguriert');
    }

    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Basic ${btoa(this.preferences.toggl.apiToken + ':api_token')}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 401) {
          throw new Error('API-Token ungültig. Bitte überprüfen Sie Ihren Toggl API-Token.');
        }
        
        if (response.status === 403) {
          throw new Error('Zugriff verweigert. Bitte überprüfen Sie Ihre Toggl-Berechtigung.');
        }
        
        throw new Error(
          `Toggl API-Fehler: ${response.status} ${response.statusText}${
            errorData.error ? ` - ${errorData.error}` : ''
          }`
        );
      }

      return response.json();
    } catch (error) {
      // Handle CORS and network errors
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error('Verbindung zur Toggl API fehlgeschlagen. Dies kann aufgrund von CORS-Einschränkungen auftreten. Die Toggl-Integration funktioniert möglicherweise nur in der Desktop-Version der App.');
      }
      
      // Re-throw other errors
      throw error;
    }
  }

  // Sync a completed time entry with tracked time
  async syncCompletedTimeEntry(
    taskTitle: string,
    taskDescription: string,
    trackedMinutes: number,
    projectId?: number
  ): Promise<TogglTimeEntry> {
    if (!this.preferences?.toggl?.workspaceId) {
      throw new Error('Workspace ID not configured');
    }

    const workspaceId = parseInt(this.preferences.toggl.workspaceId);
    const now = new Date();
    const startTime = new Date(now.getTime() - trackedMinutes * 60 * 1000);

    const timeEntry = {
      description: this.preferences.toggl.useTaskDescriptions && taskDescription 
        ? `${taskTitle} - ${taskDescription}` 
        : taskTitle,
      start: startTime.toISOString(),
      stop: now.toISOString(),
      duration: trackedMinutes * 60, // Convert to seconds
      workspace_id: workspaceId,
      project_id: projectId || (this.preferences.toggl.defaultProjectId ? parseInt(this.preferences.toggl.defaultProjectId) : undefined),
      created_with: 'TaskFuchs',
    };

    return this.makeRequest<TogglTimeEntry>(`/workspaces/${workspaceId}/time_entries`, {
      method: 'POST',
      body: JSON.stringify(timeEntry),
    });
  }

  // Helper method to round time to minutes if configured
  private roundTimeToMinutes(seconds: number): number {
    if (!this.preferences?.toggl?.roundTimeToMinutes) {
      return seconds;
    }
    return Math.round(seconds / 60) * 60;
  }

  // Get or create project for a task
  async getOrCreateProject(projectName: string): Promise<number | undefined> {
    if (!this.preferences?.toggl?.workspaceId || !this.preferences?.toggl?.createProjectsAutomatically) {
      return this.preferences?.toggl?.defaultProjectId ? parseInt(this.preferences.toggl.defaultProjectId) : undefined;
    }

    const workspaceId = parseInt(this.preferences.toggl.workspaceId);
    
    try {
      const projects = await this.getProjects(workspaceId);
      const existingProject = projects.find(p => p.name === projectName && p.active);
      
      if (existingProject) {
        return existingProject.id;
      }

      // Create new project
      const newProject = await this.createProject(workspaceId, projectName);
      return newProject.id;
    } catch (error) {
      console.error('Failed to get or create project:', error);
      return this.preferences?.toggl?.defaultProjectId ? parseInt(this.preferences.toggl.defaultProjectId) : undefined;
    }
  }
}

export const togglService = new TogglService(); 