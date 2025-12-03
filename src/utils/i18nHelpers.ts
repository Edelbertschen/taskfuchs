import { useTranslation } from 'react-i18next';

/**
 * Hilfsfunktion für Pluralisierung
 */
export const usePluralTranslation = (count: number, singularKey: string, pluralKey: string) => {
  const { t } = useTranslation();
  return count === 1 ? t(singularKey) : t(pluralKey);
};

/**
 * TEMPORARY: Legacy wrapper für useAppTranslation
 * Wird schrittweise durch useTranslation ersetzt
 */
export const useAppTranslation = () => {
  const { t, i18n } = useTranslation();

  // Helper function to convert camelCase to snake_case
  const camelToSnakeCase = (str: string): string => {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  };

  // Wrapper-Funktionen für die alten Namespaces
  const createNamespaceWrapper = (namespace: string): any => {
    return new Proxy({}, {
      get: (target, prop) => {
        if (typeof prop === 'string') {
          // Convert camelCase to snake_case for the translation key
          const snakeCaseKey = camelToSnakeCase(prop);
          
          // Check if this might be a nested object (like 'emptyState', 'placeholders', etc.)
          const nestedObjectKeys = ['emptyState', 'placeholders', 'tooltips', 'insights', 'statCards', 'sections', 'metrics', 'timeRange', 'tabs', 'dateLabels', 'selection', 'emptyStates', 'deleteModal', 'recurrenceTypes', 'visibility', 'searchResults', 'deleteConfirmation', 'priority'];
          if (nestedObjectKeys.includes(prop)) {
            // Return another proxy for nested objects
            return createNestedWrapper(namespace, snakeCaseKey);
          }
          
          return (options?: any) => {
            const normalizedOptions = typeof options === 'number' ? { count: options } : options;
            const result = t(`${namespace}.${snakeCaseKey}`, normalizedOptions);
            // If the translation key is not found (returns the key), try the original prop
            if (result === `${namespace}.${snakeCaseKey}`) {
              return t(`${namespace}.${prop}`, normalizedOptions);
            }
            return result;
          };
        }
        return undefined;
      }
    });
  };

  // Helper for nested objects like emptyState.title
  const createNestedWrapper = (namespace: string, parentKey: string): any => {
    return new Proxy({}, {
      get: (target, prop) => {
        if (typeof prop === 'string') {
          const snakeCaseKey = camelToSnakeCase(prop);
          return (options?: any) => {
            const normalizedOptions = typeof options === 'number' ? { count: options } : options;
            // Try nested format first: namespace.parent_key.child_key
            let result = t(`${namespace}.${parentKey}.${snakeCaseKey}`, normalizedOptions);
            if (result === `${namespace}.${parentKey}.${snakeCaseKey}`) {
              // Try flat format: namespace.parent_child
              result = t(`${namespace}.${parentKey}_${snakeCaseKey}`, normalizedOptions);
            }
            if (result === `${namespace}.${parentKey}_${snakeCaseKey}`) {
              // Try original format
              result = t(`${namespace}.${parentKey}.${prop}`, normalizedOptions);
            }
            return result;
          };
        }
        return undefined;
      }
    });
  };

  return {
    t,
    i18n,
    // Legacy namespace objects
    actions: createNamespaceWrapper('actions'),
    forms: createNamespaceWrapper('forms'),
    titles: createNamespaceWrapper('titles'),
    messages: createNamespaceWrapper('messages'),
    header: createNamespaceWrapper('header'),
    profileModal: createNamespaceWrapper('profile_modal'),
    datePickerModal: createNamespaceWrapper('date_picker_modal'),
    userGuide: createNamespaceWrapper('user_guide'),
    pins: createNamespaceWrapper('pins'),
    simpleTodayView: createNamespaceWrapper('simple_today_view'),
    focusView: createNamespaceWrapper('focus_view'),
    kanban: createNamespaceWrapper('kanban'),
    projects: createNamespaceWrapper('projects'),
    inboxView: createNamespaceWrapper('inbox_view'),
    notesView: createNamespaceWrapper('notes_view'),
    noteCard: createNamespaceWrapper('note_card'),
    noteEditor: createNamespaceWrapper('note_editor'),
    archive: createNamespaceWrapper('archive'),
    series: createNamespaceWrapper('series'),
    statistics: createNamespaceWrapper('statistics'),
    tagManager: createNamespaceWrapper('tag_manager'),
    tagInput: createNamespaceWrapper('tag_input'),
    tagFilter: createNamespaceWrapper('tag_filter'),
    smartTask: createNamespaceWrapper('smart_task'),
    taskContextMenu: createNamespaceWrapper('task_context_menu'),
    taskColumn: createNamespaceWrapper('task_column'),
    taskModal: createNamespaceWrapper('task_modal'),
    reviewView: createNamespaceWrapper('review_view'),
    recurringTasksWidget: createNamespaceWrapper('recurring_tasks_widget'),
    deadlineWidget: createNamespaceWrapper('deadline_widget'),
    boardManager: createNamespaceWrapper('board_manager'),
    microsoftAuthModal: createNamespaceWrapper('microsoft_auth_modal'),
    floatingAddButton: createNamespaceWrapper('floating_add_button'),
    tasks: createNamespaceWrapper('tasks'),
    settings_appearance: createNamespaceWrapper('settings_appearance'),
  settings_notes: createNamespaceWrapper('settings_notes'),
  settings_sidebar: createNamespaceWrapper('settings_sidebar'),
  settings_notifications: createNamespaceWrapper('settings_notifications'),
  settings_timer: createNamespaceWrapper('settings_timer'),
  settings_information: createNamespaceWrapper('settings_information'),
  settings_data: createNamespaceWrapper('settings_data'),
  settings_sync: createNamespaceWrapper('settings_sync'),
  };
}; 