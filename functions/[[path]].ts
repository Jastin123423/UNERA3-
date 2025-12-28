
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { AppContext } from './types';

// Import route handlers
import userRoutes from './users';
import postRoutes from './posts';
// Other routes like comments, likes, groups will be imported here

// Initialize the Hono app with our custom typed context
const app = new Hono<AppContext['env']>();

// --- Global Middleware ---
app.use('*', logger()); // Log all requests to the console
app.use('*', cors());   // Enable Cross-Origin Resource Sharing for all routes

// --- API Routing ---
// All requests to '/users/...' will be handled by the userRoutes module
app.route('/users', userRoutes);
// All requests to '/posts/...' will be handled by the postRoutes module
app.route('/posts', postRoutes);

// A simple root endpoint to confirm the API is running and discoverable
app.get('/', (c) => {
    return c.json({
        message: 'Welcome to the UNERA API!',
        docs: 'See the API specification for available endpoints.',
        endpoints: [
            'GET /posts',
            'POST /posts',
            'POST /users/signup',
            'POST /users/login',
        ]
    });
});

// --- Cloudflare Pages Functions Export ---
// The `onRequest` handler is the entry point for all requests to this function.
// Hono's `app.fetch` method is compatible with the Cloudflare Worker runtime.
export const onRequest = app.fetch;
