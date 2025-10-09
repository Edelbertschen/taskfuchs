export const todoistSyncManager = {
  getConfig() { return { enabled: false, projectMappings: [] }; },
  setConfig() { /* no-op */ },
  async runSync() { throw new Error('Todoist integration removed'); },
  clearErrorLog() { /* no-op */ },
}; 