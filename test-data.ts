// test-data.ts
export const TEST_USERS: User[] = [{
  id: 1,
  username: 'demo',
  name: 'Demo User',
  email: 'demo@example.com',
  profileImage: '/default-profile.png',
  coverImage: '/default-cover.jpg',
  bio: 'This is a demo account for testing',
  isVerified: false,
  followers: [],
  following: [],
  role: 'user',
  createdAt: Date.now(),
  posts: [],
  isRestricted: false
}];

export const TEST_POSTS: Post[] = [{
  id: 1,
  authorId: 1,
  content: 'Welcome to UNERA! 👋 This is a demo social platform.',
  timestamp: Date.now() - 3600000,
  formattedTime: '1h',
  createdAt: Date.now() - 3600000,
  reactions: [],
  comments: [],
  shares: 0,
  views: 0,
  type: 'text',
  visibility: 'Public'
}];

// In constants.ts
import { TEST_USERS, TEST_POSTS } from './test-data';

export const INITIAL_USERS: User[] = process.env.NODE_ENV === 'development' ? TEST_USERS : [];
export const INITIAL_POSTS: Post[] = process.env.NODE_ENV === 'development' ? TEST_POSTS : [];
