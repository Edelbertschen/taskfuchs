# TaskFuchs Marketing Website

Diese Webseite ist die offizielle Marketing-Website für die TaskFuchs Produktivitäts-App.

## Struktur

```
website/
├── index.php                 # Haupt-Webseite
├── assets/
│   ├── images/              # Logo und Icons
│   │   ├── 3d_fox.png       # TaskFuchs Logo
│   │   └── icon-512.png     # App Icon
│   └── screenshots/         # App Screenshots
│       ├── dashboard.png    # Dashboard Screenshot
│       ├── kanban.png       # Kanban Board
│       ├── smart.png        # SMART-Aufgaben
│       ├── notes.png        # Notizen System
│       ├── settings.png     # Einstellungen
│       └── mobile.png       # Mobile Ansicht
└── README.md               # Diese Datei
```

## Features der Website

- **Responsive Design**: Optimiert für Desktop, Tablet und Mobile
- **Parallax Scrolling**: Moderne Scrolling-Effekte
- **Interaktive SMART Demo**: Funktionsfähiger Task-Parser
- **Animationen**: Smooth Transitions und Hover-Effekte
- **Zielgruppen-Fokus**: 6 spezifische Zielgruppen mit Beispielen
- **Screenshot-Galerie**: Professionelle App-Screenshots

## Technische Details

- **Framework**: Vanilla PHP/HTML/CSS/JavaScript
- **Styling**: Custom CSS mit CSS Variables
- **Fonts**: Inter + JetBrains Mono von Google Fonts
- **Icons**: Material Design Icons
- **Farben**: Hauptfarbe #e06610 (TaskFuchs Orange)

## Installation

1. Webserver mit PHP-Unterstützung
2. Alle Dateien in das Webserver-Verzeichnis kopieren
3. index.php als Startseite konfigurieren

## Lokale Entwicklung

```bash
# PHP Built-in Server starten
php -S localhost:8000
```

Dann Website unter `http://localhost:8000` aufrufen. 