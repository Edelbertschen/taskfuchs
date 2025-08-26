# TaskFuchs i18n Migration Guide

## Übersicht

TaskFuchs wurde mit vollständigen englischen Übersetzungen erweitert. Alle hardcodierten deutschen Texte sollten durch das i18n-System ersetzt werden.

## Verfügbare Übersetzungen

### Neue Übersetzungskategorien:
- `actions.*` - Aktionen wie Bearbeiten, Löschen, Speichern
- `forms.*` - Formularbeschriftungen und Platzhalter
- `titles.*` - Titel für Tooltips und Dialoge
- `messages.*` - Nachrichten und Bestätigungstexte
- `headings.*` - Überschriften
- `focus.*` - Focus-Modus bezogene Texte
- `user_guide.*` - Benutzerhandbuch-Beispiele
- `microsoft_todo.*` - Microsoft To Do Integration

## Migration Guide

### 1. Import des useAppTranslation Hooks

```tsx
// Alte Variante
import { useTranslation } from 'react-i18next';

// Neue Variante (empfohlen)
import { useAppTranslation } from '../utils/i18nHelpers';
```

### 2. Verwendung in Komponenten

#### Vorher (hardcodiert):
```tsx
const DeleteConfirmationModal = ({ onConfirm, onCancel }) => {
  return (
    <div>
      <h3>Aufgabe löschen</h3>
      <p>Sind Sie sicher, dass Sie diese Aufgabe permanent löschen möchten?</p>
      <input placeholder="LÖSCHEN eingeben..." />
      <p>Bitte geben Sie exakt "LÖSCHEN" ein (ohne Anführungszeichen)</p>
      <button onClick={onCancel}>Abbrechen</button>
      <button onClick={onConfirm}>Löschen</button>
    </div>
  );
};
```

#### Nachher (übersetzt):
```tsx
const DeleteConfirmationModal = ({ onConfirm, onCancel }) => {
  const { titles, forms, actions, messages } = useAppTranslation();
  
  return (
    <div>
      <h3>{titles.deleteTask()}</h3>
      <p>{messages.areYouSureDeleteTask()}</p>
      <input placeholder={forms.placeholderDeleteConfirmation()} />
      <p>{forms.enterDeleteExactly()}</p>
      <button onClick={onCancel}>{actions.cancel()}</button>
      <button onClick={onConfirm}>{actions.delete()}</button>
    </div>
  );
};
```

### 3. Tooltips und Title-Attribute

#### Vorher:
```tsx
<button title="Bearbeiten" onClick={handleEdit}>
  <EditIcon />
</button>
```

#### Nachher:
```tsx
<button title={titles.edit()} onClick={handleEdit}>
  <EditIcon />
</button>
```

### 4. Form Placeholders

#### Vorher:
```tsx
<input 
  type="text" 
  placeholder="Neue Aufgabe hinzufügen..."
  value={taskText}
  onChange={handleChange}
/>
```

#### Nachher:
```tsx
<input 
  type="text" 
  placeholder={forms.placeholderAddNewTask()}
  value={taskText}
  onChange={handleChange}
/>
```

### 5. Conditional Text

#### Vorher:
```tsx
const statusText = isCompleted ? "Erledigt" : "Offen";
```

#### Nachher:
```tsx
const { titles } = useAppTranslation();
const statusText = isCompleted ? titles.completed() : titles.open();
```

## Prioritäre Komponenten für Migration

Die folgenden Komponenten enthalten die meisten hardcodierten deutschen Texte:

1. **DeleteConfirmationModal.tsx** - Bestätigungsdialoge
2. **BoardManager.tsx** - Kanban Board Management
3. **TaskModal.tsx** - Aufgaben-Editor
4. **ProjectKanbanBoard.tsx** - Projekt Kanban
5. **FocusView.tsx** - Focus-Modus
6. **SmartTaskInput.tsx** - Aufgaben-Eingabe
7. **NotesView.tsx** - Notizen-Ansicht
8. **TagInput.tsx** - Tag-Eingabe
9. **MicrosoftToDoSettingsSection.tsx** - Microsoft To Do Einstellungen

## Implementierungsstrategie

### Phase 1: Core Components
- Alle Modal-Dialoge (Löschen, Bestätigen)
- Haupt-Navigation und Buttons
- Form-Eingaben und Placeholders

### Phase 2: Feature-spezifische Komponenten
- Kanban-Boards
- Projekt-Management
- Focus-Modus
- Notizen-System

### Phase 3: Detail-Verbesserungen
- Tooltips und Hilfe-Texte
- Fehlermeldungen
- Status-Nachrichten

## Testen der Übersetzungen

1. App starten
2. In den Einstellungen auf Englisch umstellen
3. Alle Bereiche der App durchgehen
4. Prüfen, ob noch deutsche Texte vorhanden sind

## Code-Beispiele für häufige Patterns

### Bedingte Übersetzungen:
```tsx
import { useConditionalTranslation } from '../utils/i18nHelpers';

const MyComponent = ({ isActive }) => {
  const statusText = useConditionalTranslation(
    isActive, 
    'common.active', 
    'common.inactive'
  );
  
  return <span>{statusText}</span>;
};
```

### Pluralisierung:
```tsx
import { usePluralTranslation } from '../utils/i18nHelpers';

const TaskCounter = ({ count }) => {
  const taskText = usePluralTranslation(
    count,
    'tasks.single_task',
    'tasks.multiple_tasks'
  );
  
  return <span>{count} {taskText}</span>;
};
```

### Komplexe Übersetzungen mit Parametern:
```tsx
const { t } = useAppTranslation();

const WelcomeMessage = ({ username }) => {
  return <h1>{t('common.welcome_user', { name: username })}</h1>;
};
```

## Nächste Schritte

1. Übersetzungen für fehlende Schlüssel hinzufügen
2. Komponenten schrittweise migrieren
3. Tests für beide Sprachen durchführen
4. Performance der i18n-Implementierung optimieren

Durch diese Migration wird TaskFuchs vollständig mehrsprachig und bietet eine konsistente Benutzererfahrung in beiden Sprachen. 