// Hono environment types for type-safe context variables

export type User = {
  id: string;
  email: string;
  isAdmin: boolean;
};

export type Env = {
  Variables: {
    user: User;
  };
};

