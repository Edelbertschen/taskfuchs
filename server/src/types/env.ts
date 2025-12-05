// Hono environment types for type-safe context variables

export type User = {
  id: string;
  email: string;
  isAdmin: boolean;
};

export type Env = {
  Variables: {
    user: User;
    msAccessToken?: string; // Microsoft Graph API access token (set by ensureMsToken middleware)
  };
};

