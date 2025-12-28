
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { sign } from 'hono/jwt';
import { AppContext } from './types';

const userRoutes = new Hono<AppContext['env']>();

// --- Helper Functions ---
// Securely hashes a password using the Web Crypto API (available in Cloudflare Workers)
async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    // Convert buffer to hex string
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- Zod Schemas for Validation ---
const signupSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters long.'),
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters long.'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// --- API Routes ---

/**
 * POST /users/signup
 * Creates a new user account.
 */
userRoutes.post(
  '/signup',
  zValidator('json', signupSchema),
  async (c) => {
    const { username, email, password } = c.req.valid('json');
    const db = c.env.DB;

    // 1. Check if a user with the same email or username already exists
    const existingUser = await db.prepare('SELECT id FROM users WHERE email = ? OR username = ?')
        .bind(email, username)
        .first();

    if (existingUser) {
        return c.json({ error: 'A user with this email or username already exists.' }, 409);
    }
    
    // 2. Hash the password for secure storage
    const password_hash = await hashPassword(password);

    try {
        // 3. Insert the new user into the database
        const { meta } = await db.prepare('INSERT INTO users (username, email, password_hash, profile_image_url) VALUES (?, ?, ?, ?)')
            .bind(username, email, password_hash, `https://ui-avatars.com/api/?name=${username}&background=random`)
            .run();
        
        const newUserId = meta.last_row_id;
        if (!newUserId) {
            return c.json({ error: 'Failed to create user account.' }, 500);
        }

        // 4. Sign a JWT for the new user to log them in immediately
        const token = await sign({ id: newUserId, exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7) }, c.env.JWT_SECRET);

        return c.json({ message: 'User created successfully.', token }, 201);
    } catch (e: any) {
        console.error("Signup DB Error:", e.message);
        return c.json({ error: 'An error occurred while creating the account.' }, 500);
    }
  }
);

/**
 * POST /users/login
 * Authenticates a user and returns a JWT.
 */
userRoutes.post(
    '/login',
    zValidator('json', loginSchema),
    async (c) => {
        const { email, password } = c.req.valid('json');
        const db = c.env.DB;

        // 1. Find the user by email
        // @google/genai-api-fix: The D1Database type is 'any', so we cannot use generics on .first(). Using type assertion instead.
        const user = await db.prepare('SELECT id, password_hash FROM users WHERE email = ?')
            .bind(email)
            .first() as { id: number; password_hash: string } | null;

        if (!user) {
            return c.json({ error: 'Invalid email or password.' }, 401);
        }

        // 2. Hash the provided password and compare it to the stored hash
        const request_password_hash = await hashPassword(password);
        if (request_password_hash !== user.password_hash) {
            return c.json({ error: 'Invalid email or password.' }, 401);
        }

        // 3. If credentials are valid, sign and return a new JWT
        const token = await sign({ id: user.id, exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7) }, c.env.JWT_SECRET);
        
        return c.json({ message: 'Login successful.', token });
    }
);

export default userRoutes;