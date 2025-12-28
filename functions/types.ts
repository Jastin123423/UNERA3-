// @google/genai-api-fix: Define placeholder types for D1Database and R2Bucket as the @cloudflare/workers-types are not available in this environment.
type D1Database = any;
type R2Bucket = any;

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