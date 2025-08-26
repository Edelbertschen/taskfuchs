# 🚀 Microsoft To Do - Schnellstart-Anleitung

Eine 5-Minuten-Anleitung zur Einrichtung der Microsoft To Do-Integration in TaskFuchs.

## 🏠 Für Privatnutzer - Komplett kostenlos!

> ✅ **Ja, das funktioniert mit Ihrem normalen Microsoft-Konto!**  
> ❌ **NEIN, Sie brauchen keine bezahlte Azure-Subscription!**  
> 🆓 **Alles ist kostenlos für Privatnutzer!**

**Warum Azure App Registration?** Microsoft verlangt aus Sicherheitsgründen, dass jede App registriert wird - auch für Privatnutzer. Das ist wie ein "Personalausweis" für Apps und dauert nur 5 Minuten.

## ⚡ Voraussetzungen

- [ ] TaskFuchs ist installiert und läuft
- [ ] Sie haben ein Microsoft-Konto (Outlook, Hotmail, Xbox, etc.)
- [ ] Internet-Verbindung ist verfügbar
- [ ] **WICHTIG:** Sie haben eine Azure App Registration erstellt (siehe Schritt 1)

> **⚠️ Entwicklungshinweis:** Wenn Sie TaskFuchs in der Entwicklungsumgebung (HTTP) verwenden, wird automatisch ein Fallback für die Authentifizierung verwendet. Für Produktionsumgebungen sollte HTTPS verwendet werden.

## 📋 Schritt-für-Schritt-Anleitung

### 🔑 Schritt 0: Kostenloses App-"Zertifikat" erstellen (5 Min.)

**Für Privatnutzer:** Erstellen Sie ein kostenloses "Zertifikat" für TaskFuchs bei Microsoft:

1. **Azure Portal öffnen (kostenlos):**
   - Gehen Sie zu [https://portal.azure.com](https://portal.azure.com)
   - Melden Sie sich mit Ihrem **normalen Microsoft-Konto** an (Outlook, Hotmail, etc.)
   - ✅ **Keine Kreditkarte oder Bezahlung erforderlich!**

2. **App Registration erstellen:**
   - Suchen Sie nach "App registrations" oder "App-Registrierungen"
   - Klicken Sie auf "+ New registration" / "+ Neue Registrierung"
   
3. **App-Details eingeben (einfach kopieren):**
   ```
   📝 Name: TaskFuchs Microsoft To Do Integration
   👥 Unterstützte Kontotypen: Konten in allen Organisationsverzeichnissen und persönliche Microsoft-Konten
   🔗 Umleitungs-URI: Web → http://localhost:5173/auth/microsoft
   ```
   
   > 💡 **Tipp:** Kopieren Sie einfach die Texte oben in die entsprechenden Felder!

4. **Client ID kopieren:**
   - Nach der Erstellung sehen Sie die "Application (client) ID"
   - **Kopieren Sie diese ID** - Sie brauchen sie für Schritt 1!

5. **Berechtigungen hinzufügen:**
   - Gehen Sie zu "API permissions" / "API-Berechtigungen"
   - Klicken Sie auf "+ Add a permission" / "+ Berechtigung hinzufügen"
   - Wählen Sie "Microsoft Graph"
   - Wählen Sie "Delegated permissions" / "Delegierte Berechtigungen"
   - Suchen und wählen Sie: `Tasks.ReadWrite`
   - Klicken Sie auf "Add permissions" / "Berechtigungen hinzufügen"

6. **Client ID in TaskFuchs einfügen:**
   - Öffnen Sie `src/utils/microsoftTodoService.ts`
   - Ersetzen Sie `'YOUR_AZURE_CLIENT_ID_HERE'` mit Ihrer echten Client ID
   ```typescript
   clientId: 'ihre-echte-client-id-hier',
   ```

> 🎉 **Fertig!** Sie haben erfolgreich Ihr kostenloses "App-Zertifikat" erstellt. Keine Sorge über Kosten - für Privatnutzer ist Microsoft To Do API komplett kostenlos!

### 1. Microsoft To Do-Einstellungen öffnen

1. Starten Sie TaskFuchs
2. Klicken Sie auf das **Zahnrad-Symbol** (⚙️) oben rechts
3. Wählen Sie **Microsoft To Do** aus der Seitenleiste

```
🖼️ Screenshot: TaskFuchs Einstellungen → Microsoft To Do Tab
```

### 2. Mit Microsoft anmelden

1. Klicken Sie auf **"Mit Microsoft anmelden"**
2. Ein Popup-Fenster öffnet sich mit der Microsoft-Anmeldung
3. Geben Sie Ihre Microsoft-Kontodaten ein
4. Bestätigen Sie die Berechtigung für To Do-Zugriff

```
🖼️ Screenshot: Microsoft OAuth Popup mit Anmeldemaske
```

**💡 Tipp**: Falls das Popup nicht erscheint, überprüfen Sie Ihre Popup-Blocker-Einstellungen.

### 3. To Do-Liste auswählen

Nach erfolgreicher Anmeldung:

1. TaskFuchs lädt automatisch Ihre verfügbaren To Do-Listen
2. Wählen Sie die Liste aus, die synchronisiert werden soll
3. Standardmäßig wird Ihre **Hauptliste** vorausgewählt

```
🖼️ Screenshot: Listen-Auswahl mit Radio-Buttons
```

### 4. Erste Synchronisation starten

1. Klicken Sie auf **"Jetzt synchronisieren"**
2. Warten Sie, bis die Synchronisation abgeschlossen ist
3. Ihre Microsoft To Do-Aufgaben erscheinen jetzt in TaskFuchs

```
🖼️ Screenshot: Sync-Button und Fortschrittsbalken
```

### 5. Automatische Synchronisation aktivieren (Optional)

Für nahtlose Synchronisation:

1. Aktivieren Sie **"Automatische Synchronisation"**
2. Stellen Sie das gewünschte Intervall ein (empfohlen: 30 Minuten)
3. Aktivieren Sie **"Beim Start synchronisieren"**

```
🖼️ Screenshot: Sync-Einstellungen mit Toggle-Switches
```

## ✅ Fertig!

🎉 **Glückwunsch!** Ihre Microsoft To Do-Integration ist jetzt aktiv.

### Was passiert jetzt?

- **TaskFuchs → Microsoft To Do**: Neue Aufgaben in TaskFuchs werden automatisch zu Microsoft To Do hinzugefügt
- **Microsoft To Do → TaskFuchs**: Änderungen in Microsoft To Do werden in TaskFuchs übernommen
- **Bidirektional**: Prioritäten, Beschreibungen und Status bleiben synchron

## ❓ Häufige Fragen (Privatnutzer)

### "Ist das wirklich kostenlos?"
**✅ JA!** Für Privatnutzer ist alles kostenlos:
- Azure Portal Zugang: ✅ Kostenlos
- App Registration: ✅ Kostenlos  
- Microsoft To Do API: ✅ Kostenlos
- Keine versteckten Kosten: ✅ Garantiert

### "Brauche ich eine Kreditkarte?"
**❌ NEIN!** Sie brauchen nur Ihr normales Microsoft-Konto (Outlook, Hotmail, Xbox, etc.).

### "Kann Microsoft meine Daten sehen?"
TaskFuchs speichert **nur die Berechtigung**, auf Ihre To Do-Listen zuzugreifen. Microsoft kann nicht sehen, was TaskFuchs macht - nur dass Sie der App erlaubt haben, Ihre To Do-Listen zu lesen/bearbeiten.

## 🔧 Häufige Probleme

### "Application with identifier 'YOUR_AZURE_CLIENT_ID_HERE' was not found"
**Problem**: Sie haben noch keine Azure App Registration erstellt oder die Client ID nicht ersetzt  
**Lösung**: Folgen Sie **Schritt 0** oben, um eine Azure App Registration zu erstellen und die echte Client ID in der Datei `src/utils/microsoftTodoService.ts` einzufügen.

### "Invalid size of Code_Challenge parameter"
**Problem**: Microsoft zeigt einen Authentifizierungsfehler  
**Lösung**: Dies wurde in der neuesten Version behoben. Die Code Challenge wird nun korrekt mit 43 Zeichen generiert. Starten Sie TaskFuchs neu und versuchen Sie die Anmeldung erneut.

### "Popup wird blockiert"
**Lösung**: Popup-Blocker für TaskFuchs deaktivieren
```bash
Chrome: Adressleiste → Popup-Symbol → "Immer erlauben"
Firefox: Einstellungen → Datenschutz → Popups → Ausnahme hinzufügen
Safari: Einstellungen → Websites → Pop-ups → TaskFuchs erlauben
```

### "Keine Listen gefunden"
**Lösung**: 
1. Öffnen Sie Microsoft To Do im Browser
2. Erstellen Sie mindestens eine Liste
3. Kehren Sie zu TaskFuchs zurück und klicken Sie auf "Listen aktualisieren"

### "Synchronisation schlägt fehl"
**Lösung**:
1. Überprüfen Sie Ihre Internet-Verbindung
2. Klicken Sie auf "Verbindung testen"
3. Falls erforderlich: Abmelden und neu anmelden

## 🎯 Nächste Schritte

### Erweiterte Konfiguration
- [ ] Konfliktauflösung konfigurieren
- [ ] Sync-Intervall optimieren
- [ ] Benachrichtigungen einrichten

### Workflow optimieren
- [ ] Tags zwischen Systemen abstimmen
- [ ] Prioritäten-Schema definieren
- [ ] Regelmäßige Backup-Routine einrichten

## 💡 Pro-Tipps

### 🏆 Produktivitäts-Tipps
1. **Zentrale Liste**: Verwenden Sie Ihre Haupt-To Do-Liste für alle wichtigen Aufgaben
2. **Smart Input**: Nutzen Sie TaskFuchs' intelligente Aufgabenerstellung mit natürlicher Sprache
3. **Offline-First**: TaskFuchs funktioniert auch offline, Sync erfolgt bei nächster Verbindung

### 🔒 Sicherheits-Tipps
1. **Token-Sicherheit**: Melden Sie sich regelmäßig ab und neu an
2. **Berechtigungen**: Überprüfen Sie regelmäßig Ihre Microsoft-App-Berechtigungen
3. **Backup**: Exportieren Sie regelmäßig Ihre TaskFuchs-Daten

### ⚡ Performance-Tipps
1. **Sync-Intervall**: Bei vielen Aufgaben längere Intervalle wählen (60+ Minuten)
2. **Selektive Sync**: Nutzen Sie separate Listen für verschiedene Bereiche
3. **Cleanup**: Löschen Sie regelmäßig abgeschlossene Aufgaben

## 📞 Hilfe benötigt?

### 🆘 Support-Kanäle
- **GitHub Issues**: [Fehlerbericht erstellen](https://github.com/your-repo/taskfuchs/issues/new)
- **Diskussionen**: [Community-Forum](https://github.com/your-repo/taskfuchs/discussions)
- **Dokumentation**: [Vollständige Anleitung](MICROSOFT-TODO-INTEGRATION.md)

### 📚 Weitere Ressourcen
- **Video-Tutorial**: [YouTube-Playlist](https://youtube.com/playlist?list=taskfuchs-tutorials)
- **Blog**: [Produktivitäts-Tipps](https://blog.taskfuchs.app)
- **Newsletter**: [Updates abonnieren](https://taskfuchs.app/newsletter)

---

## 🎯 Zusammenfassung für Privatnutzer

**✅ JA, Sie können Microsoft To Do als Privatnutzer verbinden!**

1. **5 Minuten Setup** - Kostenlose App Registration bei Microsoft
2. **Komplett kostenlos** - Keine Kreditkarte, keine versteckten Kosten  
3. **Sicher** - TaskFuchs hat nur Zugriff auf Ihre To Do-Listen
4. **Einfach** - Folgen Sie einfach Schritt 0-3 oben

**Warum Azure App Registration?** Microsoft verlangt dies aus Sicherheitsgründen - wie ein "Personalausweis" für Apps. Das ist bei **allen** Apps so, die Microsoft-Daten nutzen (auch bei offiziellen Apps von Drittanbietern).

---

**Viel Erfolg mit Ihrer neuen Microsoft To Do-Integration!** 🦊✨

*Diese Anleitung wurde für TaskFuchs v1.1.0+ erstellt. Bei älteren Versionen können Abweichungen auftreten.* 