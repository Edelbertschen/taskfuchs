// Stub for removed Todoist integration
// These methods are called in Settings.tsx but Todoist integration has been removed

export const todoistService = {
  configure: () => { 
    throw new Error('Todoist integration removed'); 
  },
  sync: async () => { 
    throw new Error('Todoist integration removed'); 
  },
  updatePreferences: (_prefs: any) => { 
    /* no-op */ 
  },
  testConnection: async () => {
    return {
      success: false,
      message: 'Todoist integration has been removed'
    };
  },
  getProjects: async () => {
    return [];
  },
  syncTasks: async (_tasks: any[], _archivedTasks: any[]) => {
    return {
      success: false,
      localTasksToAdd: [],
      localTasksToUpdate: [],
      localTasksToSync: [],
      errors: ['Todoist integration has been removed'],
      created: 0,
      updated: 0,
    };
  },
};
