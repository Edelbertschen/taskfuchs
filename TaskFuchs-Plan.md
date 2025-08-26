# # TaskFuchs – Umsetzungsplan

## Phase 1 – Grundlagen & Architektur

- Wahl der Technologien (z. B. Frontend-Framework, Backend-Stack)
- Einrichtung Tauri-Projekt (Desktop) und Web-App
- Einrichtung Code-Repository, CI/CD
- Einrichtung Übersetzungs-Mechanismus (deutsch/englisch)
- Entwurf Datenmodell:
  - Aufgaben
  - Unteraufgaben
  - Spalten
  - Zeit-Tracking
  - Wiederholungen
  - Tags
  - Benutzerprofile
- Einrichtung lokaler Verschlüsselung der Daten (Desktop-Version)
- Vorbereitung für Offline-Funktionalität (PWA)

**Ziel:**  
Basis für alle weiteren Features. Technische Architektur steht.

---

## Phase 2 – Grundfunktionalität

- Erstellung der Benutzeroberfläche:
  - Minimalistische Seitenleiste
  - Spalten-Layout für Tage
  - freie Spalten (z. B. Backlog, Projekte)
- Verwaltung:
  - Anlegen, Bearbeiten, Löschen von Aufgaben
  - Unteraufgaben erstellen
- Drag & Drop zwischen Spalten
- Inbox-Bereich
- Parsing für schnelle Aufgabenerstellung
- Markdown-Editor + gerenderte Vorschau
- Papierkorb:
  - Wiederherstellen gelöschter Aufgaben

**Ziel:**  
Grundlegende To-Do-Verwaltung funktionsfähig.

---

## Phase 3 – Zeitmanagement & Timer

- Zeitschätzungen:
  - Aufgaben
  - Unteraufgaben
  - automatische Summierung
- Timer-Funktion:
  - Starten, Pausieren, Stoppen
  - Countdown-Mechanismus
  - Anzeige laufender Timer im Overlay
- Pomodoro-Integration:
  - einstellbare Länge
  - Anzeige abgeschlossener Pomodoros

**Ziel:**  
Nutzer kann Zeit planen und tracken.

---

## Phase 4 – UI-Verbesserungen & Interaktivität

- farbliche Fortschrittsanzeige in Cards
- Live-Update der Summen in Spaltenköpfen
- Sound-Warnungen bei:
  - Zeitüberschreitung
  - Pomodoro-Ende
- Implementierung der minimalistisch inspirierten UI aus Screenshots
- Anpassung Themes:
  - Darkmode
  - Lightmode
  - wählbare Akzentfarbe

**Ziel:**  
Optisch ansprechende und interaktive App.

---

## Phase 5 – Wiederholungen & Kalender

- Wiederholungen:
  - Tägliche, wöchentliche, monatliche, jährliche Muster
  - Wiederholung nach Erledigung
- Verwaltung aller Wiederholungen über eigene Seitenleisten-Ansicht
- Kalenderansicht:
  - Darstellung Aufgaben nach Datum
- Integration iCal (nur lesend)

**Ziel:**  
Komplexere Planungslogik und Überblick über wiederkehrende Aufgaben.

---

## Phase 6 – Tags & Suche

- Tag-System:
  - Tag-Verwaltung
  - Tag-Filter über Spalten
- Zentrale Suche:
  - nach Titel
  - Beschreibung
  - Unteraufgaben
  - Tags
- Mehrfachauswahl bei Filtern

**Ziel:**  
Struktur und Flexibilität bei der Arbeit mit großen Datenmengen.

---

## Phase 7 – Kanban-Board

- Erstellung Kanban-Ansicht:
  - nach Datum
  - ohne Datum
  - nach Priorität
  - nach Tags
- Boards:
  - individuelle Boards
  - optische Markierung, ob Aufgaben geplant sind
- Umschaltung zwischen Spalten- und Kanban-Ansicht

**Ziel:**  
Alternative Darstellungsweise der Aufgaben.

---

## Phase 8 – Benutzerkonten & Synchronisation

- Account-System (Web-App):
  - Registrierung
  - Login
- Synchronisation:
  - optional via Nextcloud (WebDAV)
- Mehrere Profile/Bereiche:
  - Trennung privat / beruflich

**Ziel:**  
Daten über Geräte hinweg verfügbar machen.

---

## Phase 9 – Backups & Exporte

- Export:
  - JSON
  - CSV
  - PDF
- vollständiger Import mit Datenüberschreibung
- keine Teilimporte
- Einbindung lokaler Verschlüsselung

**Ziel:**  
Datensicherung und Portabilität gewährleisten.

---

## Phase 10 – Statistiken & Reports

- Statistiken-Bereich:
  - Tages-, Wochen-, Monatsansicht
  - Pomodoro-Übersicht
- Reports:
  - pro Tag
  - pro Projekt
  - pro Bereich
- grafische Darstellungen:
  - Balken
  - Linien
  - Tortendiagramme

**Ziel:**  
Nutzer erhält Überblick über Zeitaufwand und Fortschritte.

---

## Phase 11 – Feinschliff & Onboarding

- Erstellung interaktives Onboarding
- Dokumentation aller Shortcuts
- Performance-Optimierungen:
  - große Datenmengen
  - schnelle UI-Reaktion
- Bugfixes
- Endabnahme

**Ziel:**  
Finalisierung der App und Vorbereitung für Release.

---

## Optionale Phase – Mobile App

- mobile UI anpassen
- Synchronisation Desktop/Web → Mobile
- Testing auf iOS & Android

---

# Ziel

TaskFuchs soll eine moderne, plattformübergreifende App werden, die Einzelpersonen hilft, ihre privaten und beruflichen Aufgaben effizient zu organisieren. Der Plan erlaubt stufenweise Entwicklung, sodass früh nutzbare Ergebnisse entstehen und die App schrittweise wächst.
