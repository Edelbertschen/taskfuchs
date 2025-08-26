# # TaskFuchs – App-Beschreibung & Entwicklungs-Blueprint

## Überblick

- **Name der App:** TaskFuchs
- **Logo:** Kleiner Fuchskopf mit grünem Abhak-Häkchen
- **Zielgruppe:** Einzelpersonen zur Verwaltung privater und beruflicher Aufgaben
- **Plattformen:**
  - Desktop-App (Windows, MacOS, Linux) mit Tauri
  - Web-App (mit Login und Account-System)
  - Mobile folgt später
- **Codebasis:**
  - moderne, wartbare Codebasis
  - responsives Layout
  - saubere Dokumentation
- **Sprachen:**
  - Deutsch
  - Englisch
- **Design:**
  - modernes, minimalistisches UI
  - Darkmode & Lightmode
  - wählbare Akzentfarbe (z. B. Hex-Code)
  - optisch konsistentes Design aus einem Guss
  - Accessibility-Optionen (hoher Kontrast, größere Schriftgrößen)
- **Offline-Nutzung:**
  - Web-App soll offlinefähig sein (PWA)

---

## Benutzerverwaltung

- Web-App:
  - Login erforderlich (Account-System)
- Desktop-App:
  - lokale Nutzung ohne Account möglich
- Synchronisation:
  - optional via Nextcloud (WebDAV)
- Unterstützung mehrerer Profile/Bereiche (z. B. privat, beruflich)

---

## Datenstruktur

- Aufgaben
- Unteraufgaben
- Spalten
- Tage
- Projekte (freie Spalten)
- Tags
- Wiederholungen
- Backups
- Dateianhänge
- Zeitschätzungen
- Timer-Daten
- Statistiken

---

## Hauptfeatures

### Aufgabenverwaltung

- Spaltenansicht:
  - Darstellung der Aufgaben nach Tagen (Spalten = einzelne Tage mit Datum)
  - unterhalb der Tages-Spalten:
    - frei benennbare Spalten (z. B. Projekte, Backlog etc.)
- Drag & Drop:
  - Umsortieren innerhalb einer Spalte
  - Verschieben zwischen Spalten
- Inbox:
  - zentrale Sammelstelle für neue Aufgaben
- Detailansicht (Modal/Card):
  - zeigt vollständige Aufgabendetails
  - ermöglicht Löschen der Aufgabe via Menü
- Papierkorb:
  - gelöschte Aufgaben/Unteraufgaben wiederherstellbar

---

### Aufgaben-Inhalte

- Unteraufgaben beliebig viele möglich
- Beschreibung:
  - Markdown-Format erlaubt
  - bei Nichtbearbeitung gerendert angezeigt (z. B. Überschriften fett, Listenpunkte etc.)
- Zeitschätzungen:
  - Aufgaben und Unteraufgaben erhalten Zeitangaben (z. B. „20 Minuten“)
  - Summe aller Unteraufgaben wird automatisch zur Gesamtzeit der Aufgabe addiert
- Zeit-Tracking:
  - Play/Pause/Stop-Button im Aufgaben-Modal
  - Timer läuft rückwärts (Countdown)
  - Pomodoro-Funktion:
    - individuell einstellbare Länge
    - einstellbare Pausenlänge
    - Anzeige absolvierte Pomodoros in Statistiken
- Aktive Aufgabe:
  - stets sichtbar über Overlay oben rechts
- Live-Zeit-Anzeige:
  - Spaltenkopf zeigt Summen der geplanten Zeiten
  - Live-Update während Timer läuft
- Visuelle Fortschrittsanzeige:
  - Aufgaben-Card färbt sich progressiv je nach Zeitfortschritt
  - bei Zeitüberschreitung:
    - Farbe wechselt zu Rot
    - Warnton ertönt
    - Warnton verstummt erst nach Bestätigung oder Ergänzen zusätzlicher Minuten
- Schnelleingabe (Parsing):
  - z. B.:
    ```
    Waschmaschine 20m n Waschpulver nicht vergessen #haushalt
    ```
    - Name: Waschmaschine
    - Zeit: 20 Minuten
    - Beschreibung: Waschpulver nicht vergessen
    - Tag: #haushalt

---

### Prioritätssystem

- Drei Prioritätsstufen:
  - Hoch
  - Mittel
  - Niedrig
- Visuelle Kennzeichnung (z. B. farbige Icons oder Badges)

---

### Tags

- ansprechendes, modernes Tag-System
- Tags können Aufgaben und Unteraufgaben zugeordnet werden
- automatische Tag-Verwaltung:
  - Liste aller vergebenen Tags wächst dynamisch
- Tag-Filter:
  - oberhalb der Spalten sichtbar
  - nicht aktive Tags blass
  - aktive Tags kräftig hervorgehoben
  - Mehrfachauswahl möglich

---

### Suche

- zentrales Suchfeld, zentriert im UI
- durchsucht:
  - Aufgabennamen
  - Unteraufgaben
  - Beschreibungen
  - Tags

---

### Spaltenansicht

- Anzeigeoption:
  - 3, 5 oder 7 Spalten gleichzeitig wählbar
- Blätterfunktion:
  - kleine Pfeile rechts/links zum Blättern durch die Spalten
- Home-Button:
  - springt zum aktuellen Datum
- Kalender-Icon:
  - gezielter Sprung zu einem bestimmten Tag
- Spalten-Verwaltung:
  - Spalten anlegen, löschen, umsortieren
  - individuelle Spaltennamen möglich
- Trennung:
  - zwischen geplantem Ausführungsdatum und Deadline einer Aufgabe
- Deadlines:
  - enthalten ausschließlich ein Datum (keine Uhrzeit)

---

### Kanban-Board

- eigenständige Ansicht (über Seitenleiste erreichbar)
- Umschaltoptionen:
  - nach Datum
  - ohne Datum
  - nach Priorität
  - ohne Priorität
  - nach Tags
- individuelle Boards:
  - frei anlegbar
  - Darstellung, ob Aufgaben bereits geplant sind (d. h. Datum gesetzt)
- Export von Boards ist nicht vorgesehen

---

### Kalenderansicht

- integrierte Kalenderansicht
- Darstellung aller Aufgaben inkl. Deadlines
- iCal-Integration:
  - nur lesend
  - keine automatische Übernahme von Deadlines in iCal

---

### Wiederholungen

- Aufgaben können wiederholt werden:
  - tägliche, wöchentliche, monatliche, jährliche Intervalle
  - z. B. „jeden ersten Montag im Monat“
  - Möglichkeit: erst nach Abhaken wiederholen
- Verwaltung:
  - eigener Bereich in der Seitenleiste für alle Wiederholungen
  - Bearbeitung direkt im Aufgaben-Modal
- keine Templates für Wiederholungen

---

### Dateianhänge

- Upload von Dateianhängen (z. B. PDFs, Bilder)
- Anzeige der Dateien in der Detailansicht der Aufgabe

---

### Benachrichtigungen

- zunächst nur lokal (Desktop-Notifications)
- unterschiedliche Sounds je nach Anlass:
  - Deadline
  - Zeitüberschreitung
  - Pomodoro-Ende
- keine E-Mail-Benachrichtigungen geplant

---

### Backup & Import

- Export aller Daten als:
  - JSON
  - CSV
  - PDF
- Import:
  - nur vollständiger Import (überschreibt bestehende Daten)
- keine Teil-Imports vorgesehen
- lokale Verschlüsselung der gespeicherten Daten

---

### Statistiken & Reports

- eigener Bereich über die Seitenleiste erreichbar
- Inhalte:
  - Tages-, Wochen-, Monatsstatistiken
  - Zeitbilanzen
  - Übersicht absolvierte Pomodoros
- Reports:
  - pro Tag
  - pro Projekt
  - pro Bereich (privat, beruflich)
- grafische Darstellung:
  - Balkendiagramme
  - Liniendiagramme
  - Tortendiagramme

---

### Shortcuts

- umfassende Tastaturkürzel
- dokumentiert über ein eigenes Icon in der Seitenleiste
- zentrale Funktionen:
  - neue Aufgabe anlegen
  - Suche öffnen
  - Timer starten/stoppen
  - Wechsel zwischen Ansichten
  - Navigation zwischen Spalten
- plattformspezifisch:
  - MacOS: Cmd
  - Windows/Linux: Ctrl

---

## Synchronisation

- optional via Nextcloud (WebDAV)
- verschlüsselte Übertragung empfohlen

---

## Onboarding

- interaktives Onboarding
- zeigt zentrale Funktionen
- klickbare Tour

---

## UI / Design

- minimalistische Seitenleiste:
  - Icons ohne Textbeschriftung
  - Tooltips beim Hover
  - einklappbar
- Buttons (z. B. „Aufgabe hinzufügen“):
  - prominent, farbig (z. B. Grün)
  - legen Aufgabe in der Inbox an
- klare, luftige Spaltenaufteilung
- Inspiration durch Apps wie TeuxDeux:
  - Spalten für Tage
  - untere Sektion für zusätzliche Listen (z. B. „Someday“)
- Card-Design:
  - leicht abgerundete Ecken
  - feine Schatten
  - moderne Typografie

---

# Ende der Spezifikation
