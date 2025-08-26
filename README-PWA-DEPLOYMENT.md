# TaskFuchs PWA Deployment auf Vercel

## 🚀 Schnellstart

```bash
# 1. Dependencies installieren (falls noch nicht geschehen)
npm install

# 2. PWA Build erstellen
npm run build:web

# 3. Deployment auf Vercel
npm run deploy:vercel
```

## 📋 Was wurde für PWA-Support hinzugefügt

### 1. PWA-Plugin & Service Worker
- ✅ `vite-plugin-pwa` installiert
- ✅ Service Worker mit Workbox konfiguriert
- ✅ Automatische Updates und Offline-Caching

### 2. Vercel-Konfiguration
- ✅ `vercel.json` für SPA-Routing
- ✅ Optimierte Caching-Header
- ✅ Service Worker Support

### 3. PWA Manifest
- ✅ Manifest im `public/` Verzeichnis
- ✅ Vollständige Icon-Sets
- ✅ PWA-Features (Shortcuts, Share Target)

### 4. Build-Scripts
- ✅ `build:web` für Vercel-Deployment
- ✅ `build:electron` für Desktop-App
- ✅ Separate Konfiguration für Web vs. Desktop

## 🔧 Deployment-Schritte

### Erstmalige Einrichtung

1. **Vercel CLI installieren**
   ```bash
   npm i -g vercel
   ```

2. **Vercel-Projekt einrichten**
   ```bash
   vercel login
   vercel link
   ```

3. **Erstes Deployment**
   ```bash
   npm run build:web
   vercel --prod
   ```

### Automatische Deployments

Nach dem ersten Setup deployt Vercel automatisch bei jedem Push auf den main/master Branch.

## 📱 PWA Features

- ✅ **Installierbar** als native App
- ✅ **Offline-Funktionalität** durch Service Worker
- ✅ **App-Shortcuts** (Neue Aufgabe, Heute, Timer)
- ✅ **Share Target** zum Teilen von Inhalten
- ✅ **Push-Notifications** (bereits implementiert)
- ✅ **Responsive Design** für alle Geräte

## 🎯 Unterschiede Web vs. Desktop

| Feature | Web (PWA) | Desktop (Electron) |
|---------|-----------|-------------------|
| Installation | Browser-basiert | Native App |
| Updates | Automatisch | Update-Dialog |
| Dateisystem | Eingeschränkt | Vollzugriff |
| Offline | Service Worker | Vollständig |
| Performance | Browser-abhängig | Optimiert |

## 🔍 Entwicklung

### Lokale PWA-Tests
```bash
# Development Server
npm run dev

# Production Build lokal testen
npm run build:web
npm run preview
```

### PWA-Features testen
1. Chrome DevTools → Application → Service Workers
2. Chrome DevTools → Application → Manifest
3. Lighthouse PWA-Audit

### Mobile Testing
- Chrome → Menü → "App installieren"
- Safari → Teilen → "Zum Home-Bildschirm"

## 🚀 Live-Deployment URL

Nach dem Deployment ist die PWA verfügbar unter:
`https://your-project-name.vercel.app`

## 📊 Performance

Die PWA ist optimiert für:
- ⚡ Schnelle Ladezeiten durch Code-Splitting
- 🗜️ Minimale Bundle-Größe
- 📱 Mobile-first Responsive Design
- 🔄 Offline-Funktionalität
- 🎯 Progressive Enhancement

## 🔧 Konfiguration

### Environment Variables (Vercel)
Setze diese in den Vercel Project Settings:
- `NODE_ENV=production`
- Weitere API-Keys falls erforderlich

### Custom Domain
In Vercel Dashboard → Project Settings → Domains

## 📞 Support

Bei Problemen:
1. Vercel Build-Logs prüfen
2. Browser DevTools → Console
3. Service Worker Status überprüfen 