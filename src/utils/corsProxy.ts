// CORS Proxy utility for development environments
// This helps bypass CORS restrictions when developing locally

export class CORSProxyService {
  private static instance: CORSProxyService;
  private isDevelopment: boolean;
  private proxyEndpoints: string[];

  constructor() {
    this.isDevelopment = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' ||
                        window.location.hostname.includes('dev');
    
    // Public CORS proxy services (use with caution!)
    this.proxyEndpoints = [
      'https://cors-anywhere.herokuapp.com/',
      'https://api.allorigins.win/raw?url=',
      'https://corsproxy.io/?',
    ];
  }

  static getInstance(): CORSProxyService {
    if (!CORSProxyService.instance) {
      CORSProxyService.instance = new CORSProxyService();
    }
    return CORSProxyService.instance;
  }

  // Check if we're in development mode
  isDevelopmentMode(): boolean {
    return this.isDevelopment;
  }

  // Get proxy URL for a given target URL
  getProxyUrl(targetUrl: string, proxyIndex: number = 0): string {
    if (!this.isDevelopment || proxyIndex >= this.proxyEndpoints.length) {
      return targetUrl;
    }
    
    const proxy = this.proxyEndpoints[proxyIndex];
    return `${proxy}${encodeURIComponent(targetUrl)}`;
  }

  // Try multiple proxy endpoints
  async fetchWithProxy(url: string, options: RequestInit = {}): Promise<Response> {
    // First try direct request
    try {
      const response = await fetch(url, options);
      return response;
    } catch (directError) {
      console.log('Direct request failed, trying proxy...', directError);
      
      // If direct fails and we're in development, try proxies
      if (this.isDevelopment) {
        for (let i = 0; i < this.proxyEndpoints.length; i++) {
          try {
            const proxyUrl = this.getProxyUrl(url, i);
            console.log(`Trying proxy ${i + 1}/${this.proxyEndpoints.length}:`, proxyUrl);
            
            const response = await fetch(proxyUrl, {
              ...options,
              // Remove some headers that might cause issues with proxies
              headers: {
                ...options.headers,
                // Remove CORS-related headers
                'Access-Control-Allow-Origin': undefined,
                'Access-Control-Allow-Methods': undefined,
                'Access-Control-Allow-Headers': undefined,
              },
            });
            
            if (response.ok) {
              console.log(`✅ Proxy ${i + 1} successful`);
              return response;
            } else {
              console.log(`❌ Proxy ${i + 1} failed with status:`, response.status);
            }
          } catch (proxyError) {
            console.log(`❌ Proxy ${i + 1} failed:`, proxyError);
          }
        }
      }
      
      // If all proxies fail, throw the original error
      throw directError;
    }
  }

  // Show warning about proxy usage
  showProxyWarning(): void {
    console.warn(`
🚨 CORS Proxy Warnung 🚨

Sie verwenden einen CORS-Proxy für die Entwicklung. 
Dies ist NUR für Entwicklungszwecke gedacht!

Sicherheitshinweise:
• Verwenden Sie niemals Proxies in Produktionsumgebungen
• Proxy-Services können Ihre Daten einsehen
• Verwenden Sie nur vertrauenswürdige Proxy-Services
• Für Produktion: Verwenden Sie die Desktop-App oder konfigurieren Sie CORS auf Ihrem Server

Empfohlene Lösungen:
1. Desktop-App verwenden (keine CORS-Probleme)
2. App-Passwort in Nextcloud erstellen
3. CORS auf Ihrem Server konfigurieren
    `);
  }
}

// Export singleton instance
export const corsProxy = CORSProxyService.getInstance(); 