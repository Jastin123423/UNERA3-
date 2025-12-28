
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { AppContext } from './types';
import { authMiddleware } from './auth';

const postRoutes = new Hono<AppContext['env']>();

// --- Zod Schema for Validation ---
const createPostSchema = z.object({
    // user_id is taken from the JWT for security, not from the request body.
    content: z.string().min(1, 'Content cannot be empty.').optional(),
    media_url: z.string().url('Invalid media URL.').optional(),
}).refine(data => data.content || data.media_url, {
    message: "A post must have either content or a media URL.",
});


// --- API Routes ---

/**
 * GET /posts
 * Fetches all posts, joining with user data to include author info.
 * This is a public route.
 */
postRoutes.get('/', async (c) => {
    try {
        const { results } = await c.env.DB.prepare(
            `SELECT 
                p.id,
                p.user_id,
                p.content,
                p.media_url,
                p.created_at,
                u.username as author_name,
                u.profile_image_url as author_image
             FROM posts p 
             JOIN users u ON p.user_id = u.id 
             ORDER BY p.created_at DESC
             LIMIT 50` // Add pagination later
        ).all();
        
        return c.json(results);
    } catch (e: any) {
        console.error("Fetch Posts DB Error:", e.message);
        return c.json({ error: 'Failed to fetch posts.' }, 500);
    }
});

/**
 * POST /posts
 * Creates a new post. This is a protected route.
 */
postRoutes.post(
    '/',
    authMiddleware, // Apply authentication middleware first
    zValidator('json', createPostSchema),
    async (c) => {
        const { content, media_url } = c.req.valid('json');
        const userId = c.get('userId'); // Get user ID from the context (set by authMiddleware)

        try {
            // Insert the new post into the database
            const { meta } = await c.env.DB.prepare(
                'INSERT INTO posts (user_id, content, media_url) VALUES (?, ?, ?)'
            )
            .bind(userId, content || null, media_url || null)
            .run();

            if (!meta.last_row_id) {
                return c.json({ error: 'Failed to create the post.' }, 500);
            }
            
            // Fetch the newly created post to return it in the response
            const newPost = await c.env.DB.prepare('SELECT * FROM posts WHERE id = ?').bind(meta.last_row_id).first();

            return c.json(newPost, 201);

        } catch (e: any) {
            console.error("Create Post DB Error:", e.message);
            return c.json({ error: 'An error occurred while creating the post.' }, 500);
        }
    }
);

export default postRoutes;
