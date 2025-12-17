/**
 * API Service for communicating with the TaskFuchs backend
 */

// Use VITE_API_URL if defined, otherwise empty string for same-origin (proxied) requests
// Only fall back to localhost:3001 if VITE_API_URL is undefined
const API_URL = import.meta.env.VITE_API_URL !== undefined 
  ? import.meta.env.VITE_API_URL 
  : 'http://localhost:3001';

// Generic fetch wrapper with authentication
async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('taskfuchs_jwt');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    // Token expired or invalid, trigger logout
    localStorage.removeItem('taskfuchs_jwt');
    window.dispatchEvent(new CustomEvent('auth:logout'));
    throw new Error('Authentication required');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.message || 'Request failed');
  }

  return response.json();
}

// ==================
// Auth API
// ==================

export const authAPI = {
  async exchangeCode(code: string, codeVerifier: string, redirectUri: string) {
    return fetchAPI<{ token: string; user: any }>('/api/auth/microsoft', {
      method: 'POST',
      body: JSON.stringify({ code, codeVerifier, redirectUri })
    });
  },

  async getCurrentUser() {
    return fetchAPI<{ user: any }>('/api/auth/me');
  },

  async logout() {
    return fetchAPI<{ success: boolean }>('/api/auth/logout', {
      method: 'POST'
    });
  }
};

// ==================
// Tasks API
// ==================

export const tasksAPI = {
  async getAll(includeArchived = false) {
    const params = includeArchived ? '?includeArchived=true' : '';
    return fetchAPI<{ tasks: any[] }>(`/api/tasks${params}`);
  },

  async getArchived() {
    return fetchAPI<{ tasks: any[] }>('/api/tasks/archived');
  },

  async get(id: string) {
    return fetchAPI<{ task: any }>(`/api/tasks/${id}`);
  },

  async create(task: any) {
    return fetchAPI<{ task: any }>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(task)
    });
  },

  async update(id: string, task: any) {
    return fetchAPI<{ task: any }>(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(task)
    });
  },

  async delete(id: string) {
    return fetchAPI<{ success: boolean }>(`/api/tasks/${id}`, {
      method: 'DELETE'
    });
  },

  async archive(id: string) {
    return fetchAPI<{ task: any }>(`/api/tasks/${id}/archive`, {
      method: 'POST'
    });
  },

  async restore(id: string) {
    return fetchAPI<{ task: any }>(`/api/tasks/${id}/restore`, {
      method: 'POST'
    });
  },

  async bulkSync(tasks: any[]) {
    return fetchAPI<{ tasks: any[] }>('/api/tasks/bulk', {
      method: 'POST',
      body: JSON.stringify({ tasks })
    });
  }
};

// ==================
// Columns API
// ==================

export const columnsAPI = {
  async getAll() {
    return fetchAPI<{ columns: any[] }>('/api/columns');
  },

  async create(column: any) {
    return fetchAPI<{ column: any }>('/api/columns', {
      method: 'POST',
      body: JSON.stringify(column)
    });
  },

  async update(id: string, column: any) {
    return fetchAPI<{ column: any }>(`/api/columns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(column)
    });
  },

  async delete(id: string) {
    return fetchAPI<{ success: boolean }>(`/api/columns/${id}`, {
      method: 'DELETE'
    });
  },

  async reorder(columnIds: string[]) {
    return fetchAPI<{ success: boolean }>('/api/columns/reorder', {
      method: 'PUT',
      body: JSON.stringify({ columnIds })
    });
  },

  async bulkSync(columns: any[]) {
    return fetchAPI<{ columns: any[] }>('/api/columns/bulk', {
      method: 'POST',
      body: JSON.stringify({ columns })
    });
  }
};

// ==================
// Tags API
// ==================

export const tagsAPI = {
  async getAll() {
    return fetchAPI<{ tags: any[] }>('/api/tags');
  },

  async create(tag: any) {
    return fetchAPI<{ tag: any }>('/api/tags', {
      method: 'POST',
      body: JSON.stringify(tag)
    });
  },

  async update(id: string, tag: any) {
    return fetchAPI<{ tag: any }>(`/api/tags/${id}`, {
      method: 'PUT',
      body: JSON.stringify(tag)
    });
  },

  async delete(id: string) {
    return fetchAPI<{ success: boolean }>(`/api/tags/${id}`, {
      method: 'DELETE'
    });
  },

  async bulkSync(tags: any[]) {
    return fetchAPI<{ tags: any[] }>('/api/tags/bulk', {
      method: 'POST',
      body: JSON.stringify({ tags })
    });
  }
};

// ==================
// Notes API
// ==================

export const notesAPI = {
  async getAll(includeArchived = false) {
    const params = includeArchived ? '?includeArchived=true' : '';
    return fetchAPI<{ notes: any[] }>(`/api/notes${params}`);
  },

  async get(id: string) {
    return fetchAPI<{ note: any }>(`/api/notes/${id}`);
  },

  async create(note: any) {
    return fetchAPI<{ note: any }>('/api/notes', {
      method: 'POST',
      body: JSON.stringify(note)
    });
  },

  async update(id: string, note: any) {
    return fetchAPI<{ note: any }>(`/api/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(note)
    });
  },

  async delete(id: string) {
    return fetchAPI<{ success: boolean }>(`/api/notes/${id}`, {
      method: 'DELETE'
    });
  },

  async bulkSync(notes: any[]) {
    return fetchAPI<{ notes: any[] }>('/api/notes/bulk', {
      method: 'POST',
      body: JSON.stringify({ notes })
    });
  }
};

// ==================
// Pin Columns API
// ==================

export const pinColumnsAPI = {
  async getAll() {
    return fetchAPI<{ pinColumns: any[] }>('/api/pin-columns');
  },

  async create(pinColumn: any) {
    return fetchAPI<{ pinColumn: any }>('/api/pin-columns', {
      method: 'POST',
      body: JSON.stringify(pinColumn)
    });
  },

  async update(id: string, pinColumn: any) {
    return fetchAPI<{ pinColumn: any }>(`/api/pin-columns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(pinColumn)
    });
  },

  async delete(id: string) {
    return fetchAPI<{ success: boolean }>(`/api/pin-columns/${id}`, {
      method: 'DELETE'
    });
  },

  async bulkSync(pinColumns: any[]) {
    return fetchAPI<{ pinColumns: any[] }>('/api/pin-columns/bulk', {
      method: 'POST',
      body: JSON.stringify({ pinColumns })
    });
  }
};

// ==================
// Preferences API
// ==================

export const preferencesAPI = {
  async get() {
    return fetchAPI<{ preferences: any }>('/api/preferences');
  },

  async update(preferences: any) {
    return fetchAPI<{ preferences: any }>('/api/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences)
    });
  },

  async patch(updates: any) {
    return fetchAPI<{ preferences: any }>('/api/preferences', {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }
};

// ==================
// View State API
// ==================

export const viewStateAPI = {
  async get() {
    return fetchAPI<{ state: any }>('/api/view-state');
  },

  async update(state: any) {
    return fetchAPI<{ state: any }>('/api/view-state', {
      method: 'PUT',
      body: JSON.stringify(state)
    });
  },

  async patch(updates: any) {
    return fetchAPI<{ state: any }>('/api/view-state', {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }
};

// ==================
// Calendar API
// ==================

export const calendarAPI = {
  async getSources() {
    return fetchAPI<{ sources: any[] }>('/api/calendar/sources');
  },

  async createSource(source: any) {
    return fetchAPI<{ source: any }>('/api/calendar/sources', {
      method: 'POST',
      body: JSON.stringify(source)
    });
  },

  async updateSource(id: string, source: any) {
    return fetchAPI<{ source: any }>(`/api/calendar/sources/${id}`, {
      method: 'PUT',
      body: JSON.stringify(source)
    });
  },

  async deleteSource(id: string) {
    return fetchAPI<{ success: boolean }>(`/api/calendar/sources/${id}`, {
      method: 'DELETE'
    });
  },

  async getEvents(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchAPI<{ events: any[] }>(`/api/calendar/events${query}`);
  },

  async syncEvents(events: any[]) {
    return fetchAPI<{ events: any[] }>('/api/calendar/events', {
      method: 'POST',
      body: JSON.stringify({ events })
    });
  },

  async bulkSyncSources(sources: any[]) {
    return fetchAPI<{ sources: any[] }>('/api/calendar/sources/bulk', {
      method: 'POST',
      body: JSON.stringify({ sources })
    });
  }
};

// ==================
// Sync API
// ==================

export const syncAPI = {
  async getFullData() {
    return fetchAPI<{
      tasks: any[];
      archivedTasks: any[];
      columns: any[];
      tags: any[];
      pinColumns: any[];
      notes: any[];
      preferences: any;
      viewState: any;
      calendarSources: any[];
      events: any[];
      syncedAt: string;
    }>('/api/sync/full');
  },

  async fullSync(data: any) {
    return fetchAPI<{ success: boolean; syncedAt: string }>('/api/sync', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};

// ==================
// Admin API
// ==================

export const adminAPI = {
  async getUsers() {
    return fetchAPI<{ users: any[] }>('/api/admin/users');
  },

  async getUser(id: string) {
    return fetchAPI<{ user: any }>(`/api/admin/users/${id}`);
  },

  async deleteUser(id: string) {
    return fetchAPI<{ success: boolean; deleted: string }>(`/api/admin/users/${id}`, {
      method: 'DELETE'
    });
  },

  async getStats() {
    return fetchAPI<{
      stats: {
        totalUsers: number;
        totalTasks: number;
        totalNotes: number;
        activeUsersLast7Days: number;
        activeUsersLast30Days: number;
      };
      recentSignups: any[];
      topUsers: any[];
    }>('/api/admin/stats');
  },

  async setAdmin(id: string, isAdmin: boolean) {
    return fetchAPI<{ success: boolean; user: any }>(`/api/admin/users/${id}/admin`, {
      method: 'PUT',
      body: JSON.stringify({ isAdmin })
    });
  }
};

// ==================
// AI API
// ==================

export interface AIParsedTask {
  title: string;
  dueDate: string | null;
  estimatedTime: number | null;
  priority: 'none' | 'low' | 'medium' | 'high';
  tags: string[];
  projectName: string | null;
  description: string | null;
}

export interface AISettings {
  provider: string;
  model: string;
  enabled: boolean;
  baseUrl: string;
  hasApiKey: boolean;
  maskedApiKey: string | null;
}

export const aiAPI = {
  /**
   * Check if AI feature is enabled (for all authenticated users)
   */
  async getStatus() {
    return fetchAPI<{ enabled: boolean; model: string | null }>('/api/ai/status');
  },

  /**
   * Parse natural language text into structured task data
   */
  async parseTask(text: string, context: { projects: string[]; tags: string[] }) {
    return fetchAPI<{ parsed: AIParsedTask }>('/api/ai/parse-task', {
      method: 'POST',
      body: JSON.stringify({ text, ...context })
    });
  },

  /**
   * Parse natural language text containing multiple tasks
   */
  async parseMultipleTasks(text: string, context: { projects: string[]; tags: string[]; language?: string }) {
    return fetchAPI<{ tasks: AIParsedTask[] }>('/api/ai/parse-multiple-tasks', {
      method: 'POST',
      body: JSON.stringify({ text, ...context })
    });
  },

  /**
   * Get AI settings (admin only)
   */
  async getSettings() {
    return fetchAPI<{ settings: AISettings }>('/api/ai/settings');
  },

  /**
   * Update AI settings (admin only)
   */
  async updateSettings(settings: {
    provider?: string;
    model?: string;
    enabled?: boolean;
    baseUrl?: string;
    apiKey?: string;
  }) {
    return fetchAPI<{ settings: AISettings }>('/api/ai/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  },

  /**
   * Test AI connection (admin only)
   */
  async testConnection() {
    return fetchAPI<{ success: boolean; message: string }>('/api/ai/test', {
      method: 'POST'
    });
  }
};

