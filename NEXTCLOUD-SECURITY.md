# 🔒 Nextcloud-Sync Sicherheit & Verschlüsselung

## ✅ **Sicherheitsmaßnahmen im TaskFuchs Nextcloud-Sync**

### 🛡️ **1. Passwort-Verschlüsselung**

**AES-256-GCM Verschlüsselung:**
- Alle Passwörter werden mit **AES-256-GCM** verschlüsselt
- **PBKDF2** Key-Derivation mit 100.000 Iterationen
- **Zufällige Salts** für jede Verschlüsselung
- **Keine Klartext-Speicherung** in localStorage

```typescript
// Echte AES-Verschlüsselung mit Web Crypto API
const encrypted = await window.crypto.subtle.encrypt(
  { name: 'AES-GCM', iv },
  key,
  data
);
```

### 🔒 **2. Sichere Datenübertragung**

**HTTPS-Verschlüsselung:**
- **Nur HTTPS-Verbindungen** werden akzeptiert
- **TLS 1.2+** Verschlüsselung für alle Übertragungen
- **Schutz vor Man-in-the-Middle-Angriffen**

### 🔑 **3. App-Passwort Empfehlung**

**Begrenzte Berechtigungen:**
- UI empfiehlt **App-Passwörter** statt Haupt-Login
- **Granulare Berechtigungen** nur für WebDAV-Zugriff
- **Einfache Sperrung** ohne Haupt-Passwort zu ändern

### 🛡️ **4. Lokale Sicherheit**

**Sichere lokale Speicherung:**
- **Verschlüsselte Konfiguration** in localStorage
- **Automatische Entschlüsselung** nur bei App-Start
- **Memory-sichere Verarbeitung** - keine langfristige Klartext-Speicherung

---

## 🔐 **Technische Sicherheitsdetails**

### **Verschlüsselungsalgorithmus:**
- **Algorithm:** AES-256-GCM
- **Key Derivation:** PBKDF2 mit SHA-256
- **Iterations:** 100.000 (OWASP-konform)
- **Salt Length:** 128 Bit (16 Bytes)
- **IV Length:** 96 Bit (12 Bytes)

### **Authentifizierung:**
- **GCM-Modus** bietet integrierte Authentifizierung
- **Tampering Detection** - manipulierte Daten werden erkannt
- **Backward Compatibility** mit Fallback für alte Daten

---

## ⚠️ **Sicherheitshinweise für Benutzer**

### ✅ **Empfohlene Practices:**

1. **App-Passwort verwenden**
   - Erstellen Sie ein dediziertes App-Passwort in Nextcloud
   - Pfad: Nextcloud → Einstellungen → Sicherheit → App-Passwörter

2. **HTTPS-Server verwenden**
   - Stellen Sie sicher, dass Ihr Nextcloud-Server HTTPS verwendet
   - Vermeiden Sie HTTP-Verbindungen

3. **Sichere Sync-Ordner**
   - Verwenden Sie einen dedizierten Ordner für TaskFuchs
   - Begrenzen Sie Zugriff nur auf notwendige Benutzer

4. **Regelmäßige Updates**
   - Halten Sie Ihren Nextcloud-Server aktuell
   - Verwenden Sie die neueste TaskFuchs-Version

### ⚠️ **Sicherheitswarnungen:**

- **Öffentliche Computer:** Melden Sie sich immer ab und löschen Sie Browser-Daten
- **Geteilte Geräte:** Verwenden Sie keine persistente Anmeldung
- **Schwache Passwörter:** Vermeiden Sie einfache oder wiederverwendete Passwörter

---

## 🏢 **Enterprise & Compliance**

### **DSGVO-Konformität:**
- **Lokale Verschlüsselung** erfüllt Privacy-by-Design
- **Nutzer-kontrollierte Daten** - keine Drittanbieter-Clouds
- **Löschbarkeit** - vollständige Datenlöschung möglich

### **Security Audit Trail:**
- **Sync-Protokollierung** für Nachverfolgung
- **Verschlüsselte Logs** können für Compliance archiviert werden
- **Timestamp-basierte Versionierung**

---

## 🚨 **Incident Response**

### **Bei Sicherheitsvorfällen:**

1. **Sofort-Maßnahmen:**
   - App-Passwort in Nextcloud sperren
   - TaskFuchs-Sync deaktivieren
   - Browser-Cache leeren

2. **Wiederherstellung:**
   - Neues App-Passwort erstellen
   - Neue Sync-Konfiguration einrichten
   - Datenintegrität überprüfen

3. **Prävention:**
   - Passwort-Manager verwenden
   - Regelmäßige Sicherheitsüberprüfung
   - Überwachung der Sync-Logs

---

## 🔍 **Sicherheits-Audit**

**Letzte Überprüfung:** Dezember 2024  
**Status:** ✅ **Produktionsbereit**

**Geprüfte Komponenten:**
- ✅ Passwort-Verschlüsselung (AES-256-GCM)
- ✅ HTTPS-Übertragung  
- ✅ Key-Derivation (PBKDF2)
- ✅ Memory-Sicherheit
- ✅ Fallback-Kompatibilität

**Empfehlungen umgesetzt:**
- ✅ Web Crypto API statt eigene Implementierung
- ✅ Starke Key-Derivation mit ausreichend Iterationen  
- ✅ Authentifizierte Verschlüsselung (GCM)
- ✅ Sichere Zufallszahlengenerierung

---

*TaskFuchs Nextcloud-Sync verwendet moderne Kryptographie-Standards und folgt aktuellen Sicherheits-Best-Practices für maximalen Schutz Ihrer Daten.* 