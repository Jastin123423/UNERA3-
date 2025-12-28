// @google/genai-api-fix: Add Cloudflare Workers type reference to resolve D1Database and R2Bucket types.
/// <reference types="@cloudflare/workers-types" />

import { Context } from 'hono';

// Define the structure for the Cloudflare environment bindings
// These are configured in your Cloudflare dashboard or wrangler.toml
export type Env = {
  Bindings: {
    DB: D1Database; // D1 Database binding
    R2: R2Bucket;   // R2 Bucket binding
    JWT_SECRET: string; // Secret for signing JWTs
  };
  Variables: {
    userId: number; // This will be set by the authentication middleware
  };
};

// Custom Hono context type for end-to-end type safety
export type AppContext = Context<Env>;