
import { D1Database } from '@cloudflare/workers-types';
import { User, Post } from '../types';
import { INITIAL_USERS, INITIAL_POSTS } from '../constants';

// In a real application, these types would be generated from the database schema.
export type DbUser = User & { id: number; created_at: string; status: 'active' | 'suspended' | 'deleted'; username: string };
export type DbPost = Post & { id: number; created_at: string; status: 'active' | 'deleted'; visibility: 'Public' | 'Friends' | 'Only Me' };

// --- Mock Data Fetching Functions ---
// These simulate fetching data from a D1 database.

/**
 * Fetches a user by their unique username.
 */
export async function fetchUserByUsername(db: D1Database, username: string): Promise<{ user: DbUser | null, posts: DbPost[] }> {
    // MOCK IMPLEMENTATION
    const user = INITIAL_USERS.find(u => (u.username || u.name.toLowerCase().replace(' ', '')) === username);
    if (!user) return { user: null, posts: [] };

    const posts = INITIAL_POSTS.filter(p => p.authorId === user.id);
    
    return { 
        user: { ...user, id: user.id, username: (user.username || user.name.toLowerCase().replace(' ', '')), created_at: user.joinedDate || new Date().toISOString(), status: user.status || 'active' }, 
        posts: posts as DbPost[]
    };
}

/**
 * Fetches a single post and its author by the post's ID.
 */
export async function fetchPost(db: D1Database, id: number): Promise<{ post: DbPost | null, author: DbUser | null }> {
    // MOCK IMPLEMENTATION
    const post = INITIAL_POSTS.find(p => p.id === id);
    if (!post) return { post: null, author: null };

    const author = INITIAL_USERS.find(u => u.id === post.authorId);
    if (!author) return { post: post as DbPost, author: null };

    return {
        post: post as DbPost,
        author: { ...author, id: author.id, username: (author.username || author.name.toLowerCase().replace(' ', '')), created_at: author.joinedDate || new Date().toISOString(), status: author.status || 'active' }
    };
}

/**
 * Fetches a list of public, active posts for sitemaps or public feeds.
 */
export async function getPublicPosts(db: D1Database, limit = 200): Promise<DbPost[]> {
    // MOCK IMPLEMENTATION
    return INITIAL_POSTS
        .filter(p => p.visibility === 'Public' && p.status !== 'deleted')
        .slice(0, limit) as DbPost[];
}

/**
 * Fetches a list of public, active users for sitemaps.
 */
export async function getPublicUsers(db: D1Database, limit = 200): Promise<DbUser[]> {
    // MOCK IMPLEMENTATION
    return INITIAL_USERS
        .filter(u => u.status !== 'deleted' && u.status !== 'suspended')
        .slice(0, limit)
        .map(u => ({...u, id: u.id, username: (u.username || u.name.toLowerCase().replace(' ', '')), created_at: u.joinedDate || new Date().toISOString(), status: u.status || 'active' }));
}
