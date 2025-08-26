# 🔄 Microsoft To Do Integration - TaskFuchs

Eine vollständige, bidirektionale Synchronisation zwischen TaskFuchs und Microsoft To Do mit OAuth2-Authentifizierung und intelligenter Konfliktverwaltung.

> ⚠️ **WICHTIG:** Sie müssen zuerst eine Azure App Registration erstellen, bevor Sie die Integration nutzen können!  
> 🚀 **Schnellstart:** Siehe [MICROSOFT-TODO-QUICKSTART.md](./MICROSOFT-TODO-QUICKSTART.md) für eine 5-Minuten-Einrichtung.

## 🌟 Features

### ✅ Sichere Authentifizierung
- **OAuth2-Integration**: Anmeldung über Microsoft-Konto ohne Passwort-Speicherung
- **PKCE-Sicherheit**: Proof Key for Code Exchange für maximale Sicherheit
- **Automatische Token-Erneuerung**: Nahtlose Erneuerung abgelaufener Tokens
- **Sichere Speicherung**: Tokens werden verschlüsselt im localStorage gespeichert

### ✅ Vollständige Synchronisation
- **Bidirektionale Sync**: Änderungen werden in beide Richtungen übertragen
- **Intelligente Konfliktauflösung**: Automatische oder manuelle Konfliktbehandlung
- **Metadaten-Sync**: Prioritäten, Fälligkeitsdaten, Beschreibungen und Status
- **Echtzeit-Updates**: Sofortige Synchronisation bei Änderungen

### ✅ Flexible Konfiguration
- **Listen-Auswahl**: Synchronisation mit einer oder mehreren To Do-Listen
- **Automatische Sync**: Konfigurierbare Intervalle (5 Min - 3 Std)
- **Ereignis-gesteuert**: Sync beim Start und bei Aufgaben-Änderungen
- **Granulare Kontrolle**: Einzelne Features aktivieren/deaktivieren

## 🚀 Installation & Setup

### 1. Microsoft Azure App Registration

Bevor Sie die Integration nutzen können, müssen Sie eine App in Microsoft Azure registrieren:

#### Azure Portal Setup
1. Gehen Sie zum [Azure Portal](https://portal.azure.com)
2. Navigieren Sie zu **Azure Active Directory** → **App registrations**
3. Klicken Sie auf **New registration**

#### App-Konfiguration
```
Name: TaskFuchs Microsoft To Do Integration
Supported account types: Accounts in any organizational directory and personal Microsoft accounts
Redirect URI: 
  - Type: Single-page application (SPA)
  - URI: http://localhost:5173/auth/microsoft (Development)
  - URI: https://your-domain.com/auth/microsoft (Production)
```

#### API-Berechtigungen hinzufügen
1. Gehen Sie zu **API permissions**
2. Klicken Sie auf **Add a permission**
3. Wählen Sie **Microsoft Graph**
4. Wählen Sie **Delegated permissions**
5. Fügen Sie folgende Berechtigung hinzu:
   - `Tasks.ReadWrite` - Lesen und Schreiben von Aufgaben

#### Client-ID kopieren
1. Gehen Sie zu **Overview**
2. Kopieren Sie die **Application (client) ID**
3. Fügen Sie diese in die TaskFuchs-Konfiguration ein

### 2. TaskFuchs Konfiguration

#### Client-ID eintragen
Öffnen Sie `src/utils/microsoftTodoService.ts` und ersetzen Sie die Client-ID:

```typescript
const MICROSOFT_GRAPH_CONFIG = {
  clientId: 'IHRE-AZURE-CLIENT-ID-HIER', // Ersetzen Sie dies!
  redirectUri: typeof window !== 'undefined' ? `${window.location.origin}/auth/microsoft` : 'http://localhost:5173/auth/microsoft',
  scope: 'https://graph.microsoft.com/Tasks.ReadWrite offline_access',
  authority: 'https://login.microsoftonline.com/common',
  graphApiUrl: 'https://graph.microsoft.com/v1.0'
};
```

#### Callback-Seite bereitstellen
Die OAuth-Callback-Seite (`public/auth/microsoft.html`) ist bereits enthalten und muss zugänglich sein unter:
- Development: `http://localhost:5173/auth/microsoft.html`
- Production: `https://your-domain.com/auth/microsoft.html`

## 📖 Verwendung

### 1. Integration aktivieren

1. Öffnen Sie TaskFuchs
2. Gehen Sie zu **Einstellungen** → **Microsoft To Do**
3. Klicken Sie auf **Mit Microsoft anmelden**
4. Melden Sie sich in dem Popup-Fenster an
5. Gewähren Sie die erforderlichen Berechtigungen

### 2. Liste auswählen

Nach erfolgreicher Anmeldung:
1. Wählen Sie die To Do-Liste aus, die synchronisiert werden soll
2. Konfigurieren Sie die Sync-Einstellungen
3. Klicken Sie auf **Jetzt synchronisieren** für die erste Sync

### 3. Automatische Synchronisation

Die Integration synchronisiert automatisch:
- **Beim Start**: Wenn TaskFuchs geöffnet wird
- **Bei Änderungen**: Wenn Aufgaben bearbeitet werden
- **In Intervallen**: Alle 30 Minuten (konfigurierbar)

## ⚙️ Konfigurationsoptionen

### Sync-Einstellungen

| Option | Beschreibung | Standard |
|--------|-------------|----------|
| **Automatische Sync** | Regelmäßige Synchronisation | Ein |
| **Sync-Intervall** | Zeit zwischen automatischen Syncs | 30 Minuten |
| **Beim Start synchronisieren** | Sync beim App-Start | Ein |
| **Bei Änderungen synchronisieren** | Sync bei Aufgaben-Änderungen | Ein |
| **Bidirektionale Sync** | Änderungen in beide Richtungen | Ein |

### Konfliktauflösung

| Modus | Verhalten |
|-------|-----------|
| **Manuell entscheiden** | Benutzer wählt bei Konflikten |
| **Lokale Version bevorzugen** | TaskFuchs-Daten haben Vorrang |
| **Microsoft To Do bevorzugen** | Remote-Daten haben Vorrang |

## 🔧 Entwicklung & Debugging

### Development-Modus

```bash
# Development Server starten
npm run dev

# Mit geöffneten DevTools für Microsoft Auth
ELECTRON_ENABLE_DEVTOOLS=true npm run electron-dev
```

### Debug-Logs aktivieren

```typescript
// In microsoftTodoService.ts
const DEBUG = true;

// Erweiterte Logs in der Browser-Konsole
console.log('Microsoft To Do Sync:', result);
```

### Häufige Entwicklungsprobleme

#### CORS-Fehler
```bash
# Entwicklungsserver mit CORS-Proxy
npm run dev -- --cors
```

#### OAuth-Popup wird blockiert
```javascript
// Popup-Blocker-Erkennung
if (!authWindow) {
  alert('Bitte erlauben Sie Popups für diese Seite');
}
```

#### Token-Refresh-Fehler
```typescript
// Manueller Token-Refresh
await microsoftToDoService.refreshToken();
```

## 📊 API-Details

### Microsoft Graph API Endpunkte

Die Integration nutzt folgende Microsoft Graph APIs:

```typescript
// Listen abrufen
GET /me/todo/lists

// Aufgaben abrufen
GET /me/todo/lists/{listId}/tasks

// Aufgabe erstellen
POST /me/todo/lists/{listId}/tasks

// Aufgabe aktualisieren
PATCH /me/todo/lists/{listId}/tasks/{taskId}

// Aufgabe löschen
DELETE /me/todo/lists/{listId}/tasks/{taskId}
```

### Datenstrukturen

#### TaskFuchs → Microsoft To Do
```typescript
{
  title: string,
  body: { content: string, contentType: 'text' },
  importance: 'low' | 'normal' | 'high',
  status: 'notStarted' | 'inProgress' | 'completed',
  reminderDateTime: { dateTime: string, timeZone: string },
  dueDateTime: { dateTime: string, timeZone: string }
}
```

#### Microsoft To Do → TaskFuchs
```typescript
{
  title: string,
  description: string,
  completed: boolean,
  priority: 'none' | 'low' | 'medium' | 'high',
  reminderDate: string,
  completedAt: string,
  microsoftTodoId: string,
  microsoftTodoEtag: string
}
```

## 🔐 Sicherheit & Datenschutz

### OAuth2-Sicherheit
- **PKCE**: Proof Key for Code Exchange verhindert Authorization Code Injection
- **State Parameter**: Schutz vor CSRF-Attacken
- **Sichere Scopes**: Minimale Berechtigung nur für To Do-Listen
- **Token-Verschlüsselung**: Tokens werden verschlüsselt gespeichert

### Datenschutz
- **Keine Passwort-Speicherung**: Nur OAuth-Tokens werden gespeichert
- **Lokale Speicherung**: Alle Daten bleiben auf Ihrem Gerät
- **Minimal-Principle**: Nur notwendige Daten werden synchronisiert
- **Opt-Out jederzeit**: Integration kann jederzeit deaktiviert werden

### Compliance
- **DSGVO-konform**: Transparente Datenverarbeitung
- **Microsoft Privacy**: Unterliegt Microsoft-Datenschutzrichtlinien
- **Audit-Logs**: Vollständige Protokollierung aller Sync-Vorgänge

## 🚨 Troubleshooting

### Authentifizierung

#### "Invalid client ID"
```bash
❌ Problem: Client-ID ist ungültig oder nicht registriert
✅ Lösung: 
1. Überprüfen Sie die Client-ID in microsoftTodoService.ts
2. Stellen Sie sicher, dass die App in Azure registriert ist
3. Redirect-URI muss exakt übereinstimmen
```

#### "Popup blocked"
```bash
❌ Problem: Browser blockiert OAuth-Popup
✅ Lösung:
1. Popup-Blocker für TaskFuchs deaktivieren
2. Popup manuell erlauben
3. Alternative: Direktweiterleitung verwenden
```

### Synchronisation

#### "No lists found"
```bash
❌ Problem: Keine To Do-Listen gefunden
✅ Lösung:
1. Erstellen Sie mindestens eine Liste in Microsoft To Do
2. Überprüfen Sie die API-Berechtigungen
3. Token erneuern: Abmelden und neu anmelden
```

#### "Sync conflicts"
```bash
❌ Problem: Konflikte bei der Synchronisation
✅ Lösung:
1. Konfliktauflösung auf "Manuell" stellen
2. Einzelne Konflikte manuell lösen
3. Bei Problemen: Vollständige Neu-Synchronisation
```

### Performance

#### "Slow sync"
```bash
❌ Problem: Synchronisation ist langsam
✅ Lösung:
1. Sync-Intervall erhöhen (z.B. auf 60 Minuten)
2. "Bei Änderungen synchronisieren" deaktivieren
3. Große Listen aufteilen
```

#### "High memory usage"
```bash
❌ Problem: Hoher Speicherverbrauch
✅ Lösung:
1. Browser-Cache leeren
2. TaskFuchs neu starten
3. Sync-Log regelmäßig leeren
```

## 📈 Metriken & Monitoring

### Sync-Statistiken
Die Integration protokolliert folgende Metriken:

```typescript
{
  tasksUploaded: number,      // An Microsoft To Do gesendete Aufgaben
  tasksDownloaded: number,    // Von Microsoft To Do empfangene Aufgaben
  tasksUpdated: number,       // Aktualisierte Aufgaben
  tasksDeleted: number,       // Gelöschte Aufgaben
  conflicts: number,          // Aufgetretene Konflikte
  errors: number,             // Sync-Fehler
  lastSyncDuration: number    // Dauer der letzten Sync (ms)
}
```

### Performance-Monitoring
```typescript
// Durchschnittliche Sync-Zeit
const avgSyncTime = syncHistory.reduce((a, b) => a + b.duration, 0) / syncHistory.length;

// Erfolgsrate
const successRate = (successfulSyncs / totalSyncs) * 100;

// Fehlerrate
const errorRate = (failedSyncs / totalSyncs) * 100;
```

## 🔄 Updates & Migration

### Version 1.1.0 (Aktuell)
- ✅ OAuth2-Authentifizierung
- ✅ Bidirektionale Synchronisation
- ✅ Konfliktauflösung
- ✅ Automatische Sync-Intervalle

### Geplante Features (Version 1.2.0)
- 🔄 Multi-Listen-Synchronisation
- 🔄 Erweiterte Filteroptionen
- 🔄 Batch-Synchronisation
- 🔄 Offline-Sync-Queue

### Migration von älteren Versionen
```typescript
// Automatische Migration beim App-Start
if (oldVersion < '1.1.0') {
  await migrateMicrosoftToDoSettings();
}
```

## 🆘 Support & Community

### Hilfe erhalten
- **GitHub Issues**: [TaskFuchs Repository](https://github.com/your-repo/taskfuchs/issues)
- **Diskussionen**: [GitHub Discussions](https://github.com/your-repo/taskfuchs/discussions)
- **Wiki**: [Erweiterte Dokumentation](https://github.com/your-repo/taskfuchs/wiki)

### Mitwirken
Contributions sind willkommen! Siehe [CONTRIBUTING.md](CONTRIBUTING.md) für Details.

### Lizenz
Die Microsoft To Do-Integration ist unter der MIT-Lizenz verfügbar.

---

**TaskFuchs** 🦊 - Ihre smarte Aufgabenverwaltung mit Microsoft To Do-Integration 