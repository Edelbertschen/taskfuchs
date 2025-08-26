# 🧪 TaskFuchs Desktop-App - Testing Guide

## 🔍 Teste die neuen Fixes

### **Problem 1**: `electron-is-dev` Fehler
**Status**: ✅ Behoben

**Wie testen**:
1. Starte die Desktop-App: `npm run electron-dev`
2. ✅ **Erwartung**: Keine "Cannot find module 'electron-is-dev'" Fehlermeldung
3. ✅ **Erwartung**: App startet ohne JavaScript-Fehler

### **Problem 2**: "Cannot create BrowserWindow before app is ready"
**Status**: ✅ Behoben

**Wie testen**:
1. Starte die Desktop-App: `npm run electron-dev`
2. ✅ **Erwartung**: Keine "Cannot create BrowserWindow before app is ready" Fehlermeldung
3. ✅ **Erwartung**: App-Fenster öffnet sich korrekt

## 🚀 Vollständige Testprozedur

### **Schritt 1: Development-Modus testen**
```bash
cd web-app
npm run electron-dev
```

**Erwartete Ausgabe**:
```
Electron version: 37.2.0
Node version: 20.x.x
Platform: darwin
Is development: true
Electron app is ready
Loading URL: http://localhost:5173
```

### **Schritt 2: Production-Build testen**
```bash
npm run dist
```

**Erwartete Ausgabe**:
- ✅ Build erfolgreich
- ✅ Keine JavaScript-Fehler
- ✅ DMG-Dateien erstellt

### **Schritt 3: Installierte App testen**
1. Öffne `dist-electron/TaskFuchs-0.0.0.dmg`
2. Installiere die App
3. Starte TaskFuchs.app
4. ✅ **Erwartung**: App startet ohne Fehlermeldungen

## 🔧 Debugging-Tipps

### **Konsolen-Ausgabe prüfen**
Wenn die App startet, sollte in der Konsole stehen:
```
Electron version: 37.2.0
Node version: 20.x.x
Platform: darwin
Is development: true/false
Electron app is ready
Loading URL: http://localhost:5173 (oder file://.../index.html)
```

### **Entwicklertools öffnen**
- **Entwicklung**: Entwicklertools öffnen automatisch
- **Produktion**: F12 oder Menü → Ansicht → Entwicklertools

### **Häufige Probleme**

#### **Port-Probleme**
- **Problem**: Vite-Server läuft auf anderem Port
- **Lösung**: Die App probiert automatisch Ports 5173, 5174, 5175, 5176

#### **Build-Probleme**
- **Problem**: Alte Build-Dateien
- **Lösung**: 
  ```bash
  rm -rf dist/
  rm -rf dist-electron/
  npm run dist
  ```

#### **Icon-Probleme**
- **Problem**: Icon nicht gefunden
- **Lösung**: Icon wird automatisch geprüft, kein Fehler bei fehlendem Icon

## 🎯 Erfolgreiche Tests

### ✅ **Alle diese Punkte sollten funktionieren**:
1. **Development-Start**: `npm run electron-dev` startet ohne Fehler
2. **Production-Build**: `npm run dist` erstellt funktionierende Apps
3. **Fenster-Erstellung**: Desktop-App öffnet sich korrekt
4. **Menü-Funktionen**: Alle Menüpunkte funktionieren
5. **Externe Links**: Öffnen sich im Browser, nicht in der App
6. **Tastaturkürzel**: Funktionieren korrekt
7. **Vollbild**: F11 funktioniert
8. **Entwicklertools**: F12 funktioniert

### 🚨 **Melde diese Probleme, falls sie auftreten**:
- JavaScript-Fehler beim Start
- Leeres oder schwarzes Fenster
- Menü funktioniert nicht
- App stürzt ab
- Icon wird nicht angezeigt

## 🏆 Erwartetes Verhalten

### **Erfolgreicher Start**:
1. **Kein JavaScript-Fehler-Dialog**
2. **TaskFuchs-Fenster öffnet sich**
3. **Menü ist verfügbar**
4. **Web-App lädt korrekt**
5. **Alle Funktionen sind verfügbar**

### **Robuste Fehlerbehandlung**:
- Alle JavaScript-Fehler werden abgefangen
- Ausführliche Logging-Ausgabe
- Sichere Behandlung von fehlenden Dateien
- Mehrere Development-Ports werden probiert

## 📝 Test-Checkliste

- [ ] `npm run electron-dev` startet ohne Fehler
- [ ] Desktop-App öffnet sich korrekt
- [ ] Keine JavaScript-Fehlermeldungen
- [ ] Menü funktioniert
- [ ] Web-App lädt korrekt
- [ ] `npm run dist` erstellt funktionierende Builds
- [ ] Installierte App (.dmg) funktioniert
- [ ] Entwicklertools öffnen sich (F12)
- [ ] Vollbild funktioniert (F11)
- [ ] App schließt sich ordnungsgemäß 