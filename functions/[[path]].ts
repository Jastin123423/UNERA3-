
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { AppContext } from './types';
import { render } from './ssr/render';
import { fetchPost, fetchUserByUsername, getPublicPosts, getPublicUsers } from './db';
import userRoutes from './users';
import postRoutes from './posts';

const app = new Hono<AppContext['env']>();

// --- Global Middleware ---
app.use('*', logger());
app.use('*', cors());

// --- API Routes ---
// All API calls are prefixed with /api to separate them from SSR pages
app.route('/api/users', userRoutes);
app.route('/api/posts', postRoutes);

// --- SEO & Static Files ---

app.get('/robots.txt', (c) => {
    const content = `User-agent: *
Allow: /post/
Allow: /@
Disallow: /api/
Disallow: /messages/
Disallow: /notifications/
Disallow: /settings/

Sitemap: https://unera.social/sitemap.xml
`;
    return c.text(content);
});

app.get('/sitemap.xml', async (c) => {
    const posts = await getPublicPosts(c.env.DB);
    const users = await getPublicUsers(c.env.DB);
    const domain = 'https://unera.social';

    const postUrls = posts.map(p => `
    <url>
        <loc>${domain}/post/${p.id}</loc>
        <lastmod>${new Date(p.created_at).toISOString()}</lastmod>
        <changefreq>daily</changefreq>
        <priority>0.8</priority>
    </url>`).join('');

    const userUrls = users.map(u => `
    <url>
        <loc>${domain}/@${u.username}</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.7</priority>
    </url>`).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${postUrls}
    ${userUrls}
</urlset>`;

    return c.body(xml, 200, { 'Content-Type': 'application/xml' });
});

// --- Server-Side Rendering Routes ---

// User Profile Page: /@username
app.get('/@:username', async (c) => {
    const username = c.req.param('username');
    const { user, posts } = await fetchUserByUsername(c.env.DB, username);

    if (!user) {
        return c.body('User not found', 404); // Render a proper 404 page later
    }
    
    if (user.status === 'deleted' || user.status === 'suspended') {
        return c.body('This account is no longer available.', 410); // Render 410 page
    }

    const initialData = {
        view: 'profile',
        selectedUserId: user.id,
        profileUser: user,
        profilePosts: posts,
        users: [user], // Pass the user data
    };
    
    const html = await render(c, initialData, { type: 'profile', data: user });
    return c.html(html);
});

// Single Post Page: /post/:id
app.get('/post/:id', async (c) => {
    const id = parseInt(c.req.param('id'), 10);
    const { post, author } = await fetchPost(c.env.DB, id);

    if (!post || !author) {
        return c.body('Post not found', 404);
    }

    if (post.status === 'deleted' || author.status !== 'active') {
        return c.body('This post is no longer available.', 410);
    }
    
    if (post.visibility !== 'Public') {
        // Not a public post, prevent indexing
        const noIndexHtml = await render(c, {}, { type: 'error', data: { noindex: true, title: 'Content Not Available' } });
        return c.html(noIndexHtml, 403);
    }
    
    const initialData = {
        view: 'single_post',
        activeSinglePostId: post.id,
        posts: [post],
        users: [author],
    };

    const html = await render(c, initialData, { type: 'post', data: { post, author } });
    return c.html(html);
});

// Root / Home Page SSR
app.get('/', async (c) => {
    // For the home page, we can fetch the latest public posts
    const posts = await getPublicPosts(c.env.DB, 20); // Get latest 20
    const users = await getPublicUsers(c.env.DB, 10); // Get some users

    const initialData = {
        view: 'home',
        posts: posts,
        users: users,
    };
    const html = await render(c, initialData, { type: 'home' });
    return c.html(html);
});


export const onRequest = app.fetch;
