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
  constructor(public appKey?: string, public redirectUri?: string) {}
  async connect(): Promise<void> { throw new Error('Dropbox integration removed'); }
  async upload(): Promise<void> { throw new Error('Dropbox integration removed'); }
  async download(): Promise<void> { throw new Error('Dropbox integration removed'); }
  async getProfile(): Promise<any> { throw new Error('Dropbox integration removed'); }
}


