/**
 * Microsoft OAuth service for handling authentication
 */

// Use tenant ID for single-tenant apps (set via MS_TENANT_ID env var)
const MS_TENANT_ID = process.env.MS_TENANT_ID || 'common';
const MS_CLIENT_SECRET = process.env.MS_CLIENT_SECRET || '';
const MS_TOKEN_URL = `https://login.microsoftonline.com/${MS_TENANT_ID}/oauth2/v2.0/token`;
const MS_GRAPH_URL = 'https://graph.microsoft.com/v1.0/me';

interface MicrosoftTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token?: string;
  id_token?: string;
}

interface MicrosoftUserProfile {
  id: string;
  displayName: string;
  givenName?: string;
  surname?: string;
  mail?: string;
  userPrincipalName: string;
}

/**
 * Exchange authorization code for access token
 * Uses client_secret for confidential client flow (more secure)
 */
export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string,
  redirectUri: string,
  clientId: string
): Promise<MicrosoftTokenResponse> {
  const params = new URLSearchParams({
    client_id: clientId,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  // Add client secret if configured (confidential client flow)
  if (MS_CLIENT_SECRET) {
    params.append('client_secret', MS_CLIENT_SECRET);
  }

  const response = await fetch(MS_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Microsoft token exchange error:', error);
    throw new Error(error.error_description || 'Failed to exchange code for token');
  }

  return response.json();
}

/**
 * Get user profile from Microsoft Graph API
 */
export async function getMicrosoftUserProfile(accessToken: string): Promise<MicrosoftUserProfile> {
  const response = await fetch(MS_GRAPH_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Microsoft Graph API error:', error);
    throw new Error(error.error?.message || 'Failed to get user profile');
  }

  return response.json();
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  refreshToken: string,
  clientId: string
): Promise<MicrosoftTokenResponse> {
  const params = new URLSearchParams({
    client_id: clientId,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  // Add client secret if configured (confidential client flow)
  if (MS_CLIENT_SECRET) {
    params.append('client_secret', MS_CLIENT_SECRET);
  }

  const response = await fetch(MS_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Microsoft token refresh error:', error);
    throw new Error(error.error_description || 'Failed to refresh token');
  }

  return response.json();
}
