// Minimal Dropbox API client using OAuth PKCE
// Browser-only; no client secret required

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
}

export class DropboxClient {
  private appKey: string;
  private redirectUri: string;
  private apiBase = 'https://api.dropboxapi.com/2';
  private contentBase = 'https://content.dropboxapi.com/2';

  constructor(appKey: string, redirectUri: string) {
    this.appKey = appKey;
    this.redirectUri = redirectUri;
  }

  private async fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 15000): Promise<Response> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(input, { ...init, signal: ctrl.signal });
      return res;
    } finally {
      clearTimeout(t);
    }
  }

  async authorizeWithPopup(scopes: string[] = ['files.content.read', 'files.content.write', 'files.metadata.read', 'account_info.read']): Promise<DropboxToken> {
    const codeVerifier = this.generateRandomString(64);
    const codeChallenge = await this.sha256Base64Url(codeVerifier);
    const state = this.generateRandomString(24);

    sessionStorage.setItem('dropbox_pkce_verifier', codeVerifier);
    sessionStorage.setItem('dropbox_oauth_state', state);

    const authUrl = new URL('https://www.dropbox.com/oauth2/authorize');
    authUrl.searchParams.set('client_id', this.appKey);
    authUrl.searchParams.set('redirect_uri', this.redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('token_access_type', 'offline'); // refresh token
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('scope', scopes.join(' '));
    authUrl.searchParams.set('force_reapprove', 'true'); // ensure new scopes are granted

    const width = 480, height = 640;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open(authUrl.toString(), 'dropbox_oauth', `width=${width},height=${height},left=${left},top=${top}`);

    if (!popup) throw new Error('Popup blocked');

    const result = await new Promise<{ code?: string; state?: string; error?: string }>((resolve) => {
      let resolved = false;
      const cleanup = (handler: any, pollId: number, timeoutId: number) => {
        try { window.removeEventListener('message', handler); } catch {}
        try { clearInterval(pollId); } catch {}
        try { clearTimeout(timeoutId); } catch {}
      };

      const handler = (e: MessageEvent) => {
        if (e.origin !== window.location.origin) return;
        if (typeof e.data !== 'object' || !e.data) return;
        const { type, code, state, error } = e.data as any;
        if (type === 'DROPBOX_AUTH_CALLBACK' && !resolved) {
          resolved = true;
          cleanup(handler, pollId, timeoutId);
          resolve({ code, state, error });
          try { popup.close(); } catch {}
        }
      };
      window.addEventListener('message', handler as any);

      // Fallback: poll popup location once it navigates back to our origin
      const pollId = window.setInterval(() => {
        try {
          if (!popup || popup.closed) {
            if (!resolved) {
              resolved = true;
              cleanup(handler, pollId, timeoutId);
              resolve({ error: 'popup_closed' });
            }
            return;
          }
          const loc = popup.location;
          // Only proceed when same-origin to avoid cross-origin errors while on Dropbox domain
          if (loc.origin === window.location.origin) {
            const params = new URLSearchParams(loc.search || loc.hash?.replace(/^#/, '') || '');
            const code = params.get('code') || undefined;
            const stateParam = params.get('state') || undefined;
            const error = params.get('error') || undefined;
            if ((code || error) && !resolved) {
              resolved = true;
              cleanup(handler, pollId, timeoutId);
              resolve({ code, state: stateParam, error });
              try { popup.close(); } catch {}
            }
          }
        } catch {
          // Ignore while on Dropbox pages (cross-origin)
        }
      }, 200);

      // Safety timeout
      const timeoutId = window.setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cleanup(handler, pollId, timeoutId);
          resolve({ error: 'timeout' });
          try { popup.close(); } catch {}
        }
      }, 120000);
    });

    if (result.error) throw new Error(result.error);
    if (!result.code || !result.state) throw new Error('Missing code/state');
    if (result.state !== state) throw new Error('State mismatch');

    const token = await this.exchangeCode(result.code, codeVerifier);
    return token;
  }

  async exchangeCode(code: string, codeVerifier: string): Promise<DropboxToken> {
    const body = new URLSearchParams();
    body.set('code', code);
    body.set('grant_type', 'authorization_code');
    body.set('client_id', this.appKey);
    body.set('redirect_uri', this.redirectUri);
    body.set('code_verifier', codeVerifier);

    const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    if (!res.ok) throw new Error('Token exchange failed');
    const json = await res.json();
    return json as DropboxToken;
  }

  async refreshToken(refreshToken: string): Promise<DropboxToken> {
    const body = new URLSearchParams();
    body.set('refresh_token', refreshToken);
    body.set('grant_type', 'refresh_token');
    body.set('client_id', this.appKey);

    const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    if (!res.ok) throw new Error('Refresh failed');
    const json = await res.json();
    return json as DropboxToken;
  }

  async getCurrentAccount(accessToken: string): Promise<DropboxProfile> {
    const res = await fetch(`${this.apiBase}/users/get_current_account`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: '{}'
    });
    if (!res.ok) throw new Error('get_current_account failed');
    return res.json();
  }

  async uploadEncrypted(accessToken: string, path: string, contentB64: string, rev?: string): Promise<any> {
    const url = `${this.contentBase}/files/upload`;
    const mode = rev ? { '.tag': 'update', update: rev } : { '.tag': 'add' };
    const dropboxApiArg = {
      path,
      mode,
      autorename: false,
      mute: false,
      strict_conflict: true
    };
    const res = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify(dropboxApiArg)
      },
      body: this.base64ToArrayBuffer(contentB64)
    }, 20000);
    if (!res.ok) {
      const errTxt = await res.text().catch(() => '');
      throw new Error(`Upload failed: ${errTxt || res.status}`);
    }
    return res.json();
  }

  async downloadEncrypted(accessToken: string, path: string): Promise<{ rev: string; contentB64: string } | null> {
    const url = `${this.contentBase}/files/download`;
    const res = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Dropbox-API-Arg': JSON.stringify({ path })
      }
    }, 20000);
    if (res.status === 409) return null; // not found
    if (!res.ok) {
      const errTxt = await res.text().catch(() => '');
      throw new Error(`Download failed: ${errTxt || res.status}`);
    }
    const arrayBuf = await res.arrayBuffer();
    const b64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuf)));
    const rev = res.headers.get('dropbox-api-result');
    let metaRev = '';
    try {
      const meta = rev ? JSON.parse(rev) : {} as any;
      metaRev = meta?.rev || '';
    } catch {}
    return { rev: metaRev, contentB64: b64 };
  }

  async listFolder(accessToken: string, path: string): Promise<any> {
    const res = await this.fetchWithTimeout(`${this.apiBase}/files/list_folder`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ path })
    }, 15000);
    if (!res.ok) throw new Error('list_folder failed');
    return res.json();
  }

  async deleteFile(accessToken: string, path: string): Promise<any> {
    const res = await fetch(`${this.apiBase}/files/delete_v2`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ path })
    });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(`delete failed: ${err || res.status}`);
    }
    return res.json();
  }

  private generateRandomString(length: number): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, (x) => charset[x % charset.length]).join('');
  }

  private async sha256Base64Url(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(digest));
    const b64 = btoa(String.fromCharCode.apply(null, hashArray as any));
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary_string = atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
  }
}


