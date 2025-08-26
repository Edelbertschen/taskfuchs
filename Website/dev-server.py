#!/usr/bin/env python3
"""
TaskFuchs Website - Development Server
No-Cache Headers für sofortige Sichtbarkeit von Änderungen
"""

import http.server
import socketserver
import os
import sys
import webbrowser
import time
from threading import Timer

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # No-Cache Headers hinzufügen
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.send_header('Last-Modified', time.strftime('%a, %d %b %Y %H:%M:%S GMT', time.gmtime()))
        super().end_headers()

    def guess_type(self, path):
        mimetype = super().guess_type(path)
        # Für HTML-Dateien explizit No-Cache setzen
        if path.endswith('.html'):
            return 'text/html'
        return mimetype

def open_browser():
    """Öffnet den Browser nach einer kurzen Verzögerung"""
    webbrowser.open('http://localhost:8000')

def main():
    PORT = 8000
    
    # Zum Website-Verzeichnis wechseln
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    print("🦊 TaskFuchs Website - Development Server")
    print("=" * 50)
    print(f"📍 Serving directory: {os.getcwd()}")
    print(f"🌐 URL: http://localhost:{PORT}")
    print("🚫 No-Cache Headers: Enabled")
    print("📝 Änderungen werden sofort sichtbar!")
    print("=" * 50)
    print("⚡ Server startet...")
    
    # Browser nach 2 Sekunden öffnen
    Timer(2.0, open_browser).start()
    
    try:
        with socketserver.TCPServer(("", PORT), NoCacheHTTPRequestHandler) as httpd:
            print(f"✅ Server läuft auf Port {PORT}")
            print("🔄 Drücke Ctrl+C zum Beenden")
            print("")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server wird beendet...")
        print("👋 Auf Wiedersehen!")
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"❌ Port {PORT} ist bereits belegt!")
            print("💡 Tipp: Beende den anderen Server oder verwende einen anderen Port")
        else:
            print(f"❌ Fehler beim Starten des Servers: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 