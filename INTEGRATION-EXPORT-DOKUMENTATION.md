# 🔗 Integration-Export und Synchronisation

## Übersicht

Die Export- und Synchronisationsfunktionen von TaskFuchs wurden erweitert, um **alle eingerichteten Integrationen** vollständig zu berücksichtigen. Dies stellt sicher, dass bei Backup, Export oder Synchronisation keine Integration-Einstellungen verloren gehen.

## ✅ Unterstützte Integrationen

### 1. **Microsoft To-Do Integration**
- Verbindungseinstellungen (ausgewählte Liste, API-Konfiguration)
- Synchronisationseinstellungen (Auto-Sync, Intervalle, bidirektional)
- Konfliktlösungsstrategien
- Letzte Sync-Informationen und Status

### 2. **Toggl Integration**
- Workspace und Projekt-Konfiguration
- API-Token (verschlüsselt/anonymisiert bei Export)
- Automatische Synchronisation und Timer-Verhalten
- Projektmanagement-Einstellungen

### 3. **CalDAV Integration**
- Server-URL und Kalender-Konfiguration
- Benutzeranmeldeinformationen (ohne Passwörter bei Export)
- Synchronisationseinstellungen und -intervalle
- Bidirektionale Synchronisation und Konfliktlösung

### 4. **Nextcloud Integration**
- Server-Konfiguration und Sync-Ordner
- Automatische Synchronisation
- Versionsverwaltung und Backup-Einstellungen
- Sync-Statistiken und Verlauf

## 🚀 Verbesserungen

### Export-Funktionen (`src/utils/importExport.ts`)

#### **1. Erweiterte ExportData-Schnittstelle**
```typescript
interface ExportData {
  // ... bestehende Felder ...
  
  // 🔗 NEUE Integration-Einstellungen
  integrations?: {
    microsoftTodo?: MicrosoftToDoConfig;
    toggl?: TogglConfig;
    caldav?: CalDAVConfig;
    nextcloud?: NextcloudConfig;
  };
}
```

#### **2. Automatische Integration-Extraktion**
```typescript
function extractIntegrationSettings(preferences: any): ExportData['integrations']
```
- Extrahiert alle Integration-Einstellungen aus den Preferences
- Anonymisiert sensible Daten (API-Token, Passwörter)
- Lädt Nextcloud-Konfiguration aus localStorage

#### **3. Erweiterte JSON-Export-Funktion**
- **Version erhöht**: 2.1 (statt 1.0) für Integration-Support
- **Neue Metadaten**: `totalIntegrations` in Export-Statistiken
- **Vollständige Abdeckung**: Alle Integrationen werden explizit erfasst

#### **4. Neue Funktionen**
- `exportIntegrationsOnly()`: Exportiert nur Integration-Einstellungen
- `validateIntegrationExport()`: Validiert Vollständigkeit der Integration-Daten

### Synchronisations-Funktionen

#### **1. Nextcloud Manager (`src/utils/nextcloudManager.ts`)**
- Integration-Einstellungen werden explizit in Sync-Daten aufgenommen
- Sensible Daten werden für Cloud-Sync anonymisiert
- Version auf 2.1 erhöht für bessere Kompatibilität

#### **2. Sync Utils (`src/utils/syncUtils.ts`)**
- Vollständige Integration-Extraktion für alle Sync-Vorgänge
- Explizite Behandlung jeder Integration einzeln
- Fehlerbehandlung für fehlerhafte Konfigurationen

## 🔒 Sicherheit und Datenschutz

### **Sensible Daten**
- **API-Token**: Werden als `[GESCHÜTZT]` exportiert
- **Passwörter**: Werden nicht in Exporten/Sync übertragen
- **Benutzeranmeldeinformationen**: Nur notwendige, nicht-sensible Teile

### **Verschlüsselung**
- Lokale Speicherung bleibt verschlüsselt
- Export-Funktionen unterstützen Base64-Kodierung
- Sync-Funktionen verwenden sichere Übertragung

## 📋 Verwendung

### **Vollständiger Export mit Integrationen**
```typescript
import { exportToJSON } from './utils/importExport';

const exportData = {
  tasks,
  notes,
  preferences, // enthält Integration-Einstellungen
  // ... andere Daten
};

const jsonExport = exportToJSON(exportData);
// Enthält jetzt explizite Integration-Sektion
```

### **Nur Integration-Einstellungen exportieren**
```typescript
import { exportIntegrationsOnly } from './utils/importExport';

const integrationsBackup = exportIntegrationsOnly(preferences);
// Für schnelle Migration oder Backup nur der Integrationen
```

### **Export validieren**
```typescript
import { validateIntegrationExport } from './utils/importExport';

const validation = validateIntegrationExport(exportData);
console.log(validation.warnings); // Zeigt fehlende Konfigurationen
```

## 🎯 Vorteile

1. **Vollständigkeit**: Keine Integration geht bei Export/Sync verloren
2. **Transparenz**: Explizite Integration-Sektion im Export
3. **Sicherheit**: Sensible Daten werden geschützt
4. **Flexibilität**: Separate Integration-Exports möglich
5. **Validierung**: Automatische Überprüfung der Vollständigkeit
6. **Kompatibilität**: Rückwärtskompatibel mit älteren Exporten

## 📊 Export-Struktur

```json
{
  "app": "TaskFuchs",
  "version": "2.1",
  "exportDate": "2024-01-15T10:30:00Z",
  
  // Haupt-App-Daten
  "tasks": [...],
  "notes": [...],
  "preferences": {...},
  
  // 🔗 NEUE: Explizite Integration-Einstellungen
  "integrations": {
    "microsoftTodo": {
      "enabled": true,
      "selectedListId": "...",
      "autoSync": true,
      // ...
    },
    "caldav": {
      "enabled": true,
      "serverUrl": "https://...",
      "autoSync": true,
      // ...
    }
    // ... weitere Integrationen
  },
  
  "metadata": {
    "totalTasks": 150,
    "totalNotes": 25,
    "totalIntegrations": 2, // 🔗 NEUE Metrik
    "exportTime": 1642248600000
  }
}
```

## 🔄 Migrationshinweise

- **Alte Exporte**: Funktionieren weiterhin (Integrations-Daten aus Preferences)
- **Neue Exporte**: Enthalten explizite Integration-Sektion
- **Sync-Kompatibilität**: Automatische Erkennung und Behandlung beider Formate
- **Validierung**: Warnt bei fehlenden Integration-Daten in älteren Exporten 