# 📧 E-Mail-Integration für TaskFuchs

## Übersicht

TaskFuchs bietet eine umfassende E-Mail-Integration, die es ermöglicht, E-Mails zu importieren, zu verwalten und in Notizen und Aufgaben zu verlinken.

## ✨ Features

### 1. E-Mail-Import
- **EML/MSG-Dateien**: Drag & Drop oder Datei-Upload
- **Web-Client Integration**: Drag & Drop aus Gmail, Outlook, etc.
- **Bookmarklet**: Schneller Import aus Web-Mail-Clients
- **Mail-Client-Qualität**: Professionelle HTML-Darstellung

### 2. E-Mail-Verlinkung in Notizen und Aufgaben

#### 📝 Wie funktioniert die Verlinkung?

1. **Mail-Icon in der Formatierungsleiste**
   - Verfügbar in allen Editoren (Notizen, Aufgabenbeschreibungen)
   - Öffnet Modal zur Auswahl von E-Mails oder Notizen
   - Unterstützt sowohl E-Mails als auch normale Notizen

2. **Automatische Markdown-Link-Generierung**
   ```markdown
   [📧 Betreff der E-Mail](note://email-id-123)
   [📝 Titel der Notiz](note://note-id-456)
   ```

3. **Intelligente Vorschau-Darstellung**
   - **E-Mails**: Zeigen Mail-Icon, Betreff, Absender und Datum
   - **Notizen**: Zeigen Notiz-Icon, Titel und Content-Vorschau
   - **Interaktiv**: Klick öffnet die verlinkte E-Mail/Notiz
   - **Responsive**: Passt sich an Akzentfarben an

#### 🎯 Verwendung in der Praxis

**In Notizen:**
```markdown
# Meeting-Notizen vom 15.01.2025

Bezug zur E-Mail: [📧 Projektupdate Q1](note://email-abc123)

Wichtige Punkte:
- Budget freigegeben
- Timeline angepasst

Siehe auch: [📝 Projektplan Details](note://note-def456)
```

**In Aufgabenbeschreibungen:**
```markdown
**Aufgabe:** E-Mail beantworten

**Kontext:** [📧 Kundenanfrage Produkt X](note://email-xyz789)

**Action Items:**
1. Angebot erstellen
2. Termin vorschlagen
```

#### 🔗 Link-Darstellung

**E-Mail-Links:**
- 📧 Icon + Betreff
- Absender-Info
- Datum der E-Mail
- Hover-Effekt mit Akzentfarbe

**Notiz-Links:**
- 📝 Icon + Titel
- Content-Vorschau (erste 100 Zeichen)
- Letztes Änderungsdatum
- Hover-Effekt mit Akzentfarbe

### 3. E-Mail-Management

#### 📁 Dedizierte E-Mail-Ansicht
- Separater Tab in der Notizen-Ansicht
- Nur E-Mails werden angezeigt
- Suchfunktion für E-Mail-Inhalte
- Sortierung nach Datum

#### 🔍 Suchfunktionen
- **Volltextsuche** in E-Mail-Inhalten
- **Absender-Suche**
- **Betreff-Suche**
- **Tag-Suche**

## 🛠️ Technische Details

### Unterstützte Formate
- **.eml** (Standard E-Mail-Format)
- **.msg** (Microsoft Outlook)
- **HTML-E-Mails** (vollständige Darstellung)
- **Multipart-E-Mails** (Text + HTML)
- **Inline-Bilder** (CID-URLs werden konvertiert)
- **Anhänge** (Anzeige mit Icons)

### MIME-Unterstützung
- **Boundary-Parsing**: Multipart-Inhalte
- **Transfer-Encoding**: Base64, Quoted-Printable
- **Character-Encoding**: UTF-8, ISO-8859-1
- **Header-Decoding**: RFC 2047 encoded-words

### Sicherheit
- **Script-Entfernung**: Kein JavaScript in E-Mails
- **Iframe-Blockierung**: Keine eingebetteten Frames
- **Link-Sanitization**: Sichere URL-Behandlung
- **XSS-Schutz**: Eingabe-Validierung

## 📖 Bookmarklet für Web-Mail-Clients

### Installation

1. **Bookmarklet-Code kopieren:**
```javascript
javascript:(function(){
  const selection = window.getSelection().toString();
  const emailContent = selection || document.body.innerText;
  const subject = document.title;
  
  const taskFuchsData = {
    type: 'email',
    subject: subject,
    content: emailContent,
    source: 'bookmarklet',
    url: window.location.href,
    timestamp: new Date().toISOString()
  };
  
  const dataStr = encodeURIComponent(JSON.stringify(taskFuchsData));
  const taskFuchsUrl = `http://localhost:5174/?import=${dataStr}`;
  
  window.open(taskFuchsUrl, '_blank');
})();
```

2. **Neues Lesezeichen erstellen**
3. **Code als URL einfügen**
4. **Name vergeben**: "📧 TaskFuchs Import"

### Verwendung

1. **E-Mail in Web-Client öffnen**
2. **Gewünschten Text markieren** (optional)
3. **Bookmarklet klicken**
4. **TaskFuchs öffnet sich** mit vorausgefüllten Daten

### Unterstützte Web-Clients
- **Gmail** ✅
- **Outlook Web** ✅  
- **Yahoo Mail** ✅
- **Apple iCloud Mail** ✅
- **ProtonMail** ✅
- **Thunderbird Online** ✅

## 🎨 Design-Integration

### Akzentfarben-Support
- Alle E-Mail-Links verwenden die gewählte Akzentfarbe
- Hover-Effekte passen sich automatisch an
- Dark Mode wird vollständig unterstützt

### Responsive Design
- Mobile-optimierte E-Mail-Darstellung
- Touch-freundliche Link-Cards
- Adaptive Tabellen und Bilder

## 🚀 Performance

### Optimierungen
- **Lazy Loading**: E-Mail-Inhalte werden bei Bedarf geladen
- **Virtuelle Listen**: Für große E-Mail-Mengen
- **Caching**: Verarbeitete E-Mails werden gecacht
- **Debounced Search**: Optimierte Suchperformance

### Speicher-Effizienz
- **Base64-Komprimierung**: Für Anhänge
- **HTML-Minimierung**: Entfernung unnötiger Tags
- **Bildoptimierung**: Responsive Images

## 🔧 Erweiterte Features

### Link-Typen
```markdown
# Standard E-Mail-Link
[📧 Betreff](note://email-id)

# Standard Notiz-Link  
[📝 Titel](note://note-id)

# Mit benutzerdefinierten Text
[Wichtige E-Mail zu Projekt X](note://email-id)
```

### Automatische Erkennung
- E-Mail-Links werden automatisch als E-Mail-Cards gerendert
- Notiz-Links werden als Notiz-Cards gerendert
- Nicht gefundene Links zeigen Fehlerzustand an

### Fehlerbehandlung
- **Graceful Degradation**: Defekte Links werden elegant behandelt
- **Fallback-Rendering**: Bei Parsing-Fehlern
- **User-Feedback**: Klare Fehlermeldungen

## 📚 Best Practices

### E-Mail-Organisation
1. **Tags verwenden** für Kategorisierung
2. **Aussagekräftige Betreffs** beibehalten
3. **Regelmäßige Archivierung** alter E-Mails
4. **Verlinkung in Kontexten** für bessere Nachverfolgung

### Verlinkung-Strategien
1. **Kontext bereitstellen** beim Verlinken
2. **Beschreibende Link-Texte** verwenden
3. **Mehrfach-Verlinkung** für wichtige E-Mails
4. **Strukturierte Dokumentation** mit Links

### Performance-Tipps
1. **Große Anhänge vermeiden** wenn möglich
2. **Regelmäßige Bereinigung** nicht benötigter E-Mails
3. **Suchbegriffe spezifizieren** für bessere Performance
4. **Virtuelle Listen aktivieren** bei vielen E-Mails

---

**💡 Tipp:** Die E-Mail-Verlinkung macht TaskFuchs zu einem mächtigen Werkzeug für E-Mail-basierte Projektarbeit und Dokumentation! 