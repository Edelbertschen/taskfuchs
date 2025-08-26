# 🌤️ Nextcloud-Synchronisation - Vollständige Dokumentation

**TaskFuchs Nextcloud-Sync** bietet eine transparente, vertrauenerweckende und versionierte Backup-Lösung für Ihre Aufgaben und Notizen.

## ✨ **Hauptfeatures**

### 🔄 **Automatische Synchronisation mit Versionierung**
- **Tägliche Versionen**: Maximal eine Version pro Tag wird automatisch erstellt
- **Intelligente Erkennung**: Nur bei signifikanten Änderungen (>5% oder >10 neue Items) wird eine neue Version erstellt
- **Konfigurierbare Intervalle**: 15 Minuten bis 24 Stunden

### 📁 **Transparente Datenspeicherung**
- **JSON-Format**: Alle Daten werden als lesbare JSON-Dateien gespeichert
- **Klare Dateinamen**: `TaskFuchs_2024-01-15_14-30-00_auto.json`
- **Vollständige Exportdaten**: Wie bei der normalen Export-Funktion
- **Keine Blackbox**: Sie können jederzeit auf Ihre Dateien zugreifen

### 🕐 **Versionsmanagement**
- **Wiederherstellung**: Jede Version kann mit einem Klick wiederhergestellt werden
- **Automatische Bereinigung**: Alte Versionen werden automatisch gelöscht (konfigurierbar)
- **Manuelle Versionen**: Zusätzlich zu automatischen Versionen können Sie manuelle Snapshots erstellen
- **Detailansicht**: Vollständige Informationen über jede Version

### 🔒 **Sicherheit & Datenschutz**
- **App-Passwort Unterstützung**: Empfohlen für maximale Sicherheit
- **HTTPS-Verbindung**: Sichere Übertragung
- **Lokale Kontrolle**: Keine Passwort-Speicherung
- **Transparenz**: Alle Vorgänge sind nachvollziehbar

### 📥 **Manueller Import/Export**
- **Drag & Drop**: Einfaches Importieren von JSON-Dateien
- **Validierung**: Automatische Überprüfung der Datenintegrität
- **Kompatibilität**: Funktioniert mit allen TaskFuchs-JSON-Exporten

---

## 🚀 **Setup & Konfiguration**

### 1. **Nextcloud-Verbindung einrichten**

#### **Benötigte Informationen:**
- **Server-URL**: `https://cloud.example.com`
- **Benutzername**: Ihr Nextcloud-Benutzername
- **Passwort**: Hauptpasswort oder App-Passwort (empfohlen)
- **Sync-Ordner**: `/TaskFuchs` (wird automatisch erstellt)

#### **App-Passwort erstellen (empfohlen):**
1. In Nextcloud: **Einstellungen** → **Sicherheit**
2. **Neues App-Passwort** erstellen
3. Name: `TaskFuchs` 
4. Generiertes Passwort in TaskFuchs eingeben

### 2. **Sync-Einstellungen konfigurieren**

#### **Automatische Synchronisation:**
- **Aktiviert/Deaktiviert**: Ein-/Ausschalten der Auto-Sync
- **Intervall**: 15 Min bis 24 Stunden (empfohlen: 1-2 Stunden)
- **Konfliktlösung**: 
  - `Manuell`: Sie entscheiden bei Konflikten
  - `Lokal`: Lokale Version hat Vorrang
  - `Remote`: Nextcloud-Version hat Vorrang

#### **Versionsverwaltung:**
- **Versionen pro Tag**: 1-5 (empfohlen: 1)
- **Automatische Bereinigung**: Alte Versionen werden gelöscht

---

## 💡 **Verwendung**

### **Dashboard-Widget**
Das Nextcloud-Widget im Dashboard zeigt:
- **Verbindungsstatus**: Verbunden/Getrennt/Fehler
- **Letzte Synchronisation**: Zeitpunkt der letzten Sync
- **Nächste Synchronisation**: Geplanter nächster Sync-Zeitpunkt
- **Verfügbare Versionen**: Anzahl der Backup-Versionen
- **Schnellaktionen**: Manueller Sync, Versionen verwalten

### **Manuelle Synchronisation**
1. **Sync-Button** im Widget oder in den Einstellungen
2. **Backup erstellen** für sofortige Version
3. **Automatischer Upload** nur bei Änderungen

### **Versionen verwalten**
1. **Einstellungen** → **Nextcloud** → **Versionen**
2. Alle verfügbaren Versionen anzeigen
3. **Version wiederherstellen**: Mit Bestätigung
4. **Manuelle Version**: Sofortiger Snapshot
5. **Detailansicht**: Metadaten und Inhalt

### **Manueller Import**
1. JSON-Datei aus Nextcloud herunterladen
2. **Einstellungen** → **Import/Export** → **Nextcloud-Import**
3. Datei per Drag & Drop oder Auswahl hochladen
4. Validierung und Bestätigung
5. Import mit vollständiger Datenübernahme

---

## 🔧 **Technische Details**

### **Dateiformat**
```json
{
  "tasks": [...],
  "notes": [...],
  "tags": [...],
  "boards": [...],
  "columns": [...],
  "preferences": {...},
  "archivedTasks": [...],
  "noteLinks": [...],
  "viewState": {...},
  "projectKanbanColumns": [...],
  "projectKanbanState": {...},
  "exportDate": "2024-01-15T14:30:00.000Z",
  "version": "2.0",
  "metadata": {
    "totalTasks": 42,
    "totalNotes": 15,
    "totalTags": 8,
    "dataSize": 245760,
    "exportTime": 1705320600000
  }
}
```

### **Dateinamen-Konvention**
- **Automatisch**: `TaskFuchs_2024-01-15_14-30-00_auto.json`
- **Manuell**: `TaskFuchs_2024-01-15_14-30-00_manual.json`
- **Format**: `TaskFuchs_YYYY-MM-DD_HH-mm-ss_[auto|manual].json`

### **WebDAV-API**
- **PROPFIND**: Dateien auflisten
- **PUT**: Dateien hochladen
- **GET**: Dateien herunterladen
- **DELETE**: Alte Versionen löschen
- **MKCOL**: Ordner erstellen

### **Sync-Logik**
1. **Verbindung testen**: Server erreichbar?
2. **Dateien auflisten**: Bestehende Versionen laden
3. **Änderungen prüfen**: Signifikante Unterschiede?
4. **Upload**: Neue Version erstellen (falls nötig)
5. **Bereinigung**: Alte Versionen löschen
6. **Status aktualisieren**: Dashboard informieren

---

## 🎯 **Best Practices**

### **Sicherheit**
- ✅ **App-Passwort verwenden** statt Hauptpasswort
- ✅ **HTTPS-Verbindung** für sichere Übertragung
- ✅ **Regelmäßige Backups** zusätzlich zur Sync
- ✅ **Passwort nicht speichern** (Session-basiert)

### **Performance**
- ✅ **Sync-Intervall anpassen**: Nicht zu häufig (1-2 Stunden optimal)
- ✅ **Manuelle Versionen sparsam** verwenden
- ✅ **Alte Versionen begrenzen**: Maximal 2-3 pro Tag

### **Workflow**
- ✅ **Täglich automatisch syncen** für kontinuierliche Backups
- ✅ **Manuelle Version vor wichtigen Änderungen** erstellen
- ✅ **Regelmäßig Versionen prüfen** und bei Bedarf wiederherstellen
- ✅ **Import-Feature nutzen** für Geräte-Migration

---

## 🛠️ **Fehlerbehebung**

### **Häufige Probleme**

#### **"Verbindung fehlgeschlagen"**
- ✅ Server-URL korrekt? (mit `https://`)
- ✅ Benutzername richtig geschrieben?
- ✅ Passwort/App-Passwort gültig?
- ✅ Nextcloud erreichbar?

#### **"Passwort erforderlich"**
- ✅ Passwort wurde nicht gespeichert (Sicherheit)
- ✅ Erneut in Einstellungen eingeben
- ✅ App-Passwort verwenden

#### **"Synchronisation fehlgeschlagen"**
- ✅ Internetverbindung stabil?
- ✅ Nextcloud-Server verfügbar?
- ✅ Speicherplatz in Nextcloud ausreichend?
- ✅ Berechtigungen für Ordner vorhanden?

#### **"Version nicht gefunden"**
- ✅ Datei möglicherweise manuell gelöscht
- ✅ Versions-Liste aktualisieren
- ✅ Neue Version erstellen

### **Debug-Modus**
1. Browser-Entwicklertools öffnen (F12)
2. Console-Tab auswählen
3. Sync-Vorgang durchführen
4. Fehlermeldungen kopieren
5. Bei Support-Anfrage mitteilen

---

## 📋 **API-Referenz**

### **NextcloudSyncService**
```typescript
// Service initialisieren
const service = getNextcloudService(config);

// Vollständige Synchronisation
const result = await service.syncData(appData, {
  forceUpload: false,
  onProgress: (progress, message) => console.log(progress, message)
});

// Verfügbare Versionen laden
const versions = await service.getAvailableVersions();

// Version wiederherstellen
const data = await service.restoreVersion(versionId);

// Manuelle Version erstellen
const version = await service.createManualVersion(appData);
```

### **NextcloudConfig**
```typescript
interface NextcloudConfig {
  serverUrl: string;          // "https://cloud.example.com"
  username: string;           // "benutzername"
  password: string;           // "app-passwort"
  syncFolder: string;         // "/TaskFuchs"
  enabled: boolean;           // true/false
  autoSync: boolean;          // true/false
  syncInterval: number;       // Minuten (15-1440)
  keepVersions: number;       // Versionen pro Tag (1-5)
  conflictResolution: string; // "local"|"remote"|"manual"
}
```

---

## 🎨 **UI-Komponenten**

### **Einstellungs-Modal**
- **4 Tabs**: Verbindung, Synchronisation, Versionen, Erweitert
- **Live-Validierung**: Sofortige Überprüfung der Eingaben
- **Fortschrittsanzeige**: Sync-Progress mit Details
- **Fehlerbehandlung**: Klare Fehlermeldungen

### **Dashboard-Widget**
- **Status-Indikator**: Farbcodiert (Grün/Rot/Grau)
- **Sync-Zeiten**: Letzte und nächste Synchronisation
- **Schnellaktionen**: Sync, Versionen, Einstellungen
- **Statistiken**: Aufgaben, Notizen, Versionen

### **Versions-Manager**
- **Version-Liste**: Chronologisch sortiert
- **Details-Modal**: Metadaten und Inhalt
- **Wiederherstellung**: Mit Sicherheitsabfrage
- **Manuelle Erstellung**: Sofortiger Snapshot

### **Import-Helper**
- **Drag & Drop**: Intuitive Datei-Auswahl
- **Validierung**: Automatische Überprüfung
- **Vorschau**: Daten-Übersicht vor Import
- **Sicherheitswarnung**: Überschreibungshinweis

---

## 🔮 **Zukünftige Erweiterungen**

### **Geplante Features**
- **Verschlüsselung**: AES-256 für sensible Daten
- **Incremental Sync**: Nur Änderungen übertragen
- **Multi-Device**: Geräte-übergreifende Synchronisation
- **Collaborative**: Team-Sync für gemeinsame Projekte
- **Webhooks**: Event-basierte Synchronisation

### **Performance-Optimierungen**
- **Kompression**: GZIP für kleinere Dateien
- **Delta-Sync**: Nur Unterschiede übertragen
- **Background Sync**: Nicht-blockierende Synchronisation
- **Retry-Mechanismus**: Automatische Wiederholung bei Fehlern

---

## 📞 **Support & Feedback**

### **Community**
- **GitHub Issues**: Bug-Reports und Feature-Requests
- **Dokumentation**: Erweiterte Guides und Tutorials
- **Discord/Forum**: Community-Support und Diskussionen

### **Reporting**
Bei Problemen bitte folgende Informationen angeben:
- TaskFuchs Version
- Nextcloud Version
- Browser/OS
- Fehlermeldung
- Console-Output
- Reproduktionsschritte

---

## 🏆 **Fazit**

Die TaskFuchs Nextcloud-Synchronisation bietet:

✅ **Maximale Transparenz** - Keine versteckten Vorgänge  
✅ **Vollständige Kontrolle** - Sie besitzen Ihre Daten  
✅ **Automatische Sicherheit** - Regelmäßige Backups  
✅ **Einfache Bedienung** - Intuitive Benutzeroberfläche  
✅ **Professionelle Qualität** - Robuste und zuverlässige Implementierung  

**Ihre Daten sind sicher, transparent und jederzeit verfügbar!** 🛡️ 