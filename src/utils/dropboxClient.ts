/**
 * Dropbox API Client with OAuth2 PKCE flow
 * Browser-only implementation - no client secret required
 * Following Super Productivity sync principles
 */

export interface DropboxToken {
  access_token: string;
  token_type: string;
  uid?: string;
  account_id?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

export interface DropboxProfile {
  name?: { display_name?: string };
  email?: string;
  account_id?: string;
}

export interface DropboxFileMetadata {
  id: string;
  name: string;
  path_lower: string;
  path_display: string;
  rev: string;
  size: number;
  content_hash?: string;
  client_modified: string;
  server_modified: string;
}

export interface DropboxDownloadResult {
  data: string;
  metadata: DropboxFileMetadata;
}

export interface DropboxUploadResult {
  metadata: DropboxFileMetadata;
}

// PKCE helpers
function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('').slice(0, length);
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest('SHA-256', data);
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = '';
  bytes.forEach(byte => { str += String.fromCharCode(byte); });
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const hashed = await sha256(verifier);
  return base64UrlEncode(hashed);
}

export class DropboxClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiresAt: number | null = null;
  
  constructor(
    public appKey: string,
    public redirectUri: string = `${window.location.origin}/auth/dropbox.html`
  ) {}

  /**
   * Get stored tokens from localStorage
   */
  loadTokens(): boolean {
    try {
      const stored = localStorage.getItem('taskfuchs_dropbox_tokens');
      if (stored) {
        const tokens = JSON.parse(stored);
        this.accessToken = tokens.access_token;
        this.refreshToken = tokens.refresh_token;
        this.tokenExpiresAt = tokens.expires_at;
        return true;
      }
    } catch (e) {
      console.warn('Failed to load Dropbox tokens:', e);
    }
    return false;
  }

  /**
   * Save tokens to localStorage
   */
  private saveTokens(tokens: DropboxToken): void {
    const expiresAt = tokens.expires_in 
      ? Date.now() + (tokens.expires_in * 1000) - 60000 // Expire 1 min early
      : null;
    
    const toStore = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
    };
    
    localStorage.setItem('taskfuchs_dropbox_tokens', JSON.stringify(toStore));
    
    this.accessToken = tokens.access_token;
    this.refreshToken = tokens.refresh_token || this.refreshToken;
    this.tokenExpiresAt = expiresAt;
  }

  /**
   * Clear stored tokens
   */
  clearTokens(): void {
    localStorage.removeItem('taskfuchs_dropbox_tokens');
    localStorage.removeItem('taskfuchs_dropbox_code_verifier');
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiresAt = null;
  }

  /**
   * Check if we have valid tokens
   */
  isAuthenticated(): boolean {
    if (!this.accessToken) {
      this.loadTokens();
    }
    return !!this.accessToken;
  }

  /**
   * Check if token needs refresh
   */
  private needsRefresh(): boolean {
    if (!this.tokenExpiresAt) return false;
    return Date.now() >= this.tokenExpiresAt;
  }

  /**
   * Start OAuth2 PKCE flow - opens popup
   */
  async connect(): Promise<DropboxToken> {
    if (!this.appKey) {
      throw new Error('Dropbox App Key is required');
    }

    // Generate PKCE verifier and challenge
    const codeVerifier = generateRandomString(64);
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    
    // Store verifier for later exchange
    localStorage.setItem('taskfuchs_dropbox_code_verifier', codeVerifier);

    // Build authorization URL
    const authUrl = new URL('https://www.dropbox.com/oauth2/authorize');
    authUrl.searchParams.set('client_id', this.appKey);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', this.redirectUri);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('token_access_type', 'offline'); // Get refresh token

    // Open popup
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const popup = window.open(
      authUrl.toString(),
      'dropbox-auth',
      `width=${width},height=${height},left=${left},top=${top},popup=yes`
    );

    if (!popup) {
      throw new Error('Popup blocked. Please allow popups for this site.');
    }

    // Wait for the redirect with the code
    return new Promise((resolve, reject) => {
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageHandler);
          reject(new Error('Authorization cancelled'));
        }
      }, 500);

      const messageHandler = async (event: MessageEvent) => {
        // Check origin for security
        if (event.origin !== window.location.origin) return;
        
        if (event.data?.type === 'dropbox-auth-callback') {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageHandler);
          popup.close();

          if (event.data.error) {
            reject(new Error(event.data.error_description || event.data.error));
            return;
          }

          const code = event.data.code;
          if (!code) {
            reject(new Error('No authorization code received'));
            return;
          }

          try {
            const tokens = await this.exchangeCodeForTokens(code);
            resolve(tokens);
          } catch (e) {
            reject(e);
          }
        }
      };

      window.addEventListener('message', messageHandler);
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  private async exchangeCodeForTokens(code: string): Promise<DropboxToken> {
    const codeVerifier = localStorage.getItem('taskfuchs_dropbox_code_verifier');
    if (!codeVerifier) {
      throw new Error('Code verifier not found');
    }

    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: this.appKey,
        redirect_uri: this.redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error_description || 'Token exchange failed');
    }

    const tokens: DropboxToken = await response.json();
    this.saveTokens(tokens);
    
    // Clean up verifier
    localStorage.removeItem('taskfuchs_dropbox_code_verifier');
    
    return tokens;
  }

  /**
   * Refresh the access token
   */
  async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: this.appKey,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      if (response.status === 400 || response.status === 401) {
        // Refresh token is invalid, need to re-authenticate
        this.clearTokens();
        throw new Error('Session expired. Please reconnect to Dropbox.');
      }
      throw new Error(error.error_description || 'Token refresh failed');
    }

    const tokens: DropboxToken = await response.json();
    this.saveTokens(tokens);
  }

  /**
   * Get valid access token, refreshing if needed
   */
  private async getAccessToken(): Promise<string> {
    if (!this.accessToken) {
      this.loadTokens();
    }
    
    if (!this.accessToken) {
      throw new Error('Not authenticated. Please connect to Dropbox first.');
    }

    if (this.needsRefresh() && this.refreshToken) {
      await this.refreshAccessToken();
    }

    return this.accessToken!;
  }

  /**
   * Get current user profile
   */
  async getProfile(): Promise<DropboxProfile> {
    const token = await this.getAccessToken();
    
    const response = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error_summary || 'Failed to get profile');
    }

    return response.json();
  }

  /**
   * Download a file from Dropbox
   * Returns the file content and metadata including revision
   */
  async download(path: string): Promise<DropboxDownloadResult | null> {
    const token = await this.getAccessToken();
    
    const response = await fetch('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Dropbox-API-Arg': JSON.stringify({ path }),
      },
    });

    if (response.status === 409) {
      // File not found (path/not_found)
      const error = await response.json().catch(() => ({}));
      if (error.error?.['.tag'] === 'path' && error.error?.path?.['.tag'] === 'not_found') {
        return null;
      }
      throw new Error(error.error_summary || 'Download failed');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error_summary || 'Download failed');
    }

    // Metadata is in the header
    const metadataHeader = response.headers.get('Dropbox-API-Result');
    const metadata: DropboxFileMetadata = metadataHeader ? JSON.parse(metadataHeader) : {};
    
    const data = await response.text();
    
    return { data, metadata };
  }

  /**
   * Upload a file to Dropbox with revision conflict detection
   * If rev is provided, will fail if file was modified (conflict detection)
   */
  async upload(path: string, data: string, rev?: string): Promise<DropboxUploadResult> {
    const token = await this.getAccessToken();
    
    const args: any = {
      path,
      mode: rev ? { '.tag': 'update', 'update': rev } : { '.tag': 'overwrite' },
      autorename: false,
      mute: false,
    };

    const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Dropbox-API-Arg': JSON.stringify(args),
        'Content-Type': 'application/octet-stream',
      },
      body: data,
    });

    if (response.status === 409) {
      const error = await response.json().catch(() => ({}));
      // Check for conflict
      if (error.error?.['.tag'] === 'path' && error.error?.path?.reason?.['.tag'] === 'conflict') {
        throw new Error('CONFLICT: Remote file was modified. Pull first or force push.');
      }
      throw new Error(error.error_summary || 'Upload failed');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error_summary || 'Upload failed');
    }

    const metadata: DropboxFileMetadata = await response.json();
    return { metadata };
  }

  /**
   * Get file metadata without downloading content
   */
  async getMetadata(path: string): Promise<DropboxFileMetadata | null> {
    const token = await this.getAccessToken();
    
    const response = await fetch('https://api.dropboxapi.com/2/files/get_metadata', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path,
        include_media_info: false,
        include_deleted: false,
        include_has_explicit_shared_members: false,
      }),
    });

    if (response.status === 409) {
      const error = await response.json().catch(() => ({}));
      if (error.error?.['.tag'] === 'path' && error.error?.path?.['.tag'] === 'not_found') {
        return null;
      }
      throw new Error(error.error_summary || 'Get metadata failed');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error_summary || 'Get metadata failed');
    }

    return response.json();
  }

  /**
   * Create folder if it doesn't exist
   */
  async createFolder(path: string): Promise<void> {
    const token = await this.getAccessToken();
    
    const response = await fetch('https://api.dropboxapi.com/2/files/create_folder_v2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path, autorename: false }),
    });

    if (response.status === 409) {
      // Folder already exists, that's fine
      return;
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      // Ignore if folder exists
      if (error.error?.['.tag'] !== 'path' || error.error?.path?.['.tag'] !== 'conflict') {
        throw new Error(error.error_summary || 'Create folder failed');
      }
    }
  }

  /**
   * Delete a file
   */
  async delete(path: string): Promise<void> {
    const token = await this.getAccessToken();
    
    const response = await fetch('https://api.dropboxapi.com/2/files/delete_v2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path }),
    });

    if (!response.ok && response.status !== 409) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error_summary || 'Delete failed');
    }
  }
}

// Singleton instance
let dropboxClientInstance: DropboxClient | null = null;

export function getDropboxClient(appKey?: string): DropboxClient {
  if (!dropboxClientInstance && appKey) {
    dropboxClientInstance = new DropboxClient(appKey);
  }
  if (!dropboxClientInstance) {
    throw new Error('Dropbox client not initialized. Provide appKey first.');
  }
  return dropboxClientInstance;
}

export function resetDropboxClient(): void {
  if (dropboxClientInstance) {
    dropboxClientInstance.clearTokens();
  }
  dropboxClientInstance = null;
}
