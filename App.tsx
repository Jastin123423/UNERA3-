import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Login, Register, ForgotPassword } from './components/Auth';
import { Header, Sidebar, RightSidebar, MenuOverlay } from './components/Layout';
import { CreatePost, Post, CommentsSheet, ShareSheet, CreatePostModal, SuggestedProductsWidget } from './components/Feed';
import { StoryReel, StoryViewer, CreateStoryModal } from './components/Story';
import { UserProfile } from './components/UserProfile';
import { MarketplacePage, ProductDetailModal } from './components/Marketplace';
import { ReelsFeed, CreateReelModal } from './components/Reels';
import { ChatWindow } from './components/Chat';
import { ImageViewer } from './components/Common';
import { EventsPage, BirthdaysPage, SuggestedProfilesPage, SettingsPage, MemoriesPage } from './components/MenuPages';
import { HelpSupportPage } from './components/HelpSupport';
import { CreateEventModal } from './components/Events';
import { BrandsPage } from './components/Brands';
import { MusicSystem, GlobalAudioPlayer, MusicFeedPost } from './components/MusicSystem'; 
import { GroupsPage } from './components/Groups';
import { ToolsPage } from './components/Tools';
import { PrivacyPolicyPage } from './components/PrivacyPolicy';
import { TermsOfServicePage } from './components/TermsOfService';
import { useLanguage } from './contexts/LanguageContext';
import { User, Post as PostType, Story, Reel, Notification, Message, Event, Product, Comment, ReactionType, LinkPreview, Group, GroupPost, AudioTrack, Brand, Song, Episode } from './types';
import { INITIAL_USERS, INITIAL_POSTS, INITIAL_STORIES, INITIAL_REELS, INITIAL_EVENTS, INITIAL_GROUPS, INITIAL_BRANDS, MOCK_SONGS, MOCK_EPISODES } from './constants';
import { rankFeed } from './utils/ranking'; 

// ========== API SERVICE FUNCTIONS ==========
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

const getFormDataHeaders = (token: string | null) => {
  return {
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

const handleApiError = (error: any, defaultMessage: string) => {
  console.error('API Error:', error);
  return { success: false, error: error.message || defaultMessage };
};

// API Functions
const api = {
  // Auth
  login: async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      return await response.json();
    } catch (error) {
      return handleApiError(error, 'Login failed');
    }
  },

  register: async (userData: Partial<User>) => {
    try {
      const response = await fetch(`${API_BASE}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      return await response.json();
    } catch (error) {
      return handleApiError(error, 'Registration failed');
    }
  },

  logout: async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  // Users
  getCurrentUser: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/users/me`, {
        headers: getAuthHeaders()
      });
      return await response.json();
    } catch (error) {
      return handleApiError(error, 'Failed to fetch user');
    }
  },

  getUsers: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/users`);
      return await response.json();
    } catch (error) {
      return handleApiError(error, 'Failed to fetch users');
    }
  },

  updateUser: async (userId: number, updates: Partial<User>) => {
    try {
      const response = await fetch(`${API_BASE}/api/users/${userId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates)
      });
      return await response.json();
    } catch (error) {
      return handleApiError(error, 'Failed to update user');
    }
  },

  followUser: async (userId: number, targetUserId: number) => {
    try {
      const response = await fetch(`${API_BASE}/api/users/${targetUserId}/follow`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      return await response.json();
    } catch (error) {
      return handleApiError(error, 'Failed to follow user');
    }
  },

  unfollowUser: async (userId: number, targetUserId: number) => {
    try {
      const response = await fetch(`${API_BASE}/api/users/${targetUserId}/unfollow`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      return await response.json();
    } catch (error) {
      return handleApiError(error, 'Failed to unfollow user');
    }
  },

  // Posts
  getPosts: async (params?: { userId?: number, groupId?: string, brandId?: number }) => {
    try {
      const query = params ? `?${new URLSearchParams(params as any)}` : '';
      const response = await fetch(`${API_BASE}/api/posts${query}`);
      return await response.json();
    } catch (error) {
      return handleApiError(error, 'Failed to fetch posts');
    }
  },

  createPost: async (postData: FormData) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/api/posts`, {
        method: 'POST',
        headers: getFormDataHeaders(token),
        body: postData
      });
      return await response.json();
    } catch (error) {
      return handleApiError(error, 'Failed to create post');
    }
  },

  updatePost: async (postId: number, updates: Partial<PostType>) => {
    try {
      const response = await fetch(`${API_BASE}/api/posts/${postId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates)
      });
      return await response.json();
    } catch (error) {
      return handleApiError(error, 'Failed to update post');
    }
  },

  deletePost: async (postId: number) => {
    try {
      const response = await fetch(`${API_BASE}/api/posts/${postId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      return await response.json();
    } catch (error) {
      return handleApiError(error, 'Failed to delete post');
    }
  },

  reactToPost: async (postId: number, reactionType: ReactionType) => {
    try {
      const response = await fetch(`${API_BASE}/api/posts/${postId}/react`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ type: reactionType })
      });
      return await response.json();
    } catch (error) {
      return handleApiError(error, 'Failed to react to post');
    }
  },

  // Comments
  createComment: async (postId: number, text: string, attachment?: any, parentId?: number) => {
    try {
      const response = await fetch(`${API_BASE}/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ text, attachment, parentId })
      });
      return await response.json();
    } catch (error) {
      return handleApiError(error, 'Failed to create comment');
    }
  },

  // Feed
  getFeed: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/feed`, {
        headers: getAuthHeaders()
      });
      return await response.json();
    } catch (error) {
      return handleApiError(error, 'Failed to fetch feed');
    }
  },

  // Stories
  getStories: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/stories`);
      return await response.json();
    } catch (error) {
      return handleApiError(error, 'Failed to fetch stories');
    }
  },

  createStory: async (storyData: FormData) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/api/stories`, {
        method: 'POST',
        headers: getFormDataHeaders(token),
        body: storyData
      });
      return await response.json();
    } catch (error) {
      return handleApiError(error, 'Failed to create story');
    }
  },

  // Reels
  getReels: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/reels`);
      return await response.json();
    } catch (error) {
      return handleApiError(error, 'Failed to fetch reels');
    }
  },

  createReel: async (reelData: FormData) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/api/reels`, {
        method: 'POST',
        headers: getFormDataHeaders(token),
        body: reelData
      });
      return await response.json();
    } catch (error) {
      return handleApiError(error, 'Failed to create reel');
    }
  },

  // Products
  getProducts: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/products`);
      return await response.json();
    } catch (error) {
      return handleApiError(error, 'Failed to fetch products');
    }
  },

  createProduct: async (productData: FormData) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/api/products`, {
        method: 'POST',
        headers: getFormDataHeaders(token),
        body: productData
      });
      return await response.json();
    } catch (error) {
      return handleApiError(error, 'Failed to create product');
    }
  },

  // Groups
  getGroups: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/groups`);
      return await response.json();
    } catch (error) {
      return handleApiError(error, 'Failed to fetch groups');
    }
  },

  createGroup: async (groupData: FormData) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/api/groups`, {
        method: 'POST',
        headers: getFormDataHeaders(token),
        body: groupData
      });
      return await response.json();
    } catch (error) {
      return handleApiError(error, 'Failed to create group');
    }
  },

  // Brands
  getBrands: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/brands`);
      return await response.json();
    } catch (error) {
      return handleApiError(error, 'Failed to fetch brands');
    }
  },

  createBrand: async (brandData: FormData) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/api/brands`, {
        method: 'POST',
        headers: getFormDataHeaders(token),
        body: brandData
      });
      return await response.json();
    } catch (error) {
      return handleApiError(error, 'Failed to create brand');
    }
  },

  // Events
  getEvents: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/events`);
      return await response.json();
    } catch (error) {
      return handleApiError(error, 'Failed to fetch events');
    }
  },

  createEvent: async (eventData: FormData) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/api/events`, {
        method: 'POST',
        headers: getFormDataHeaders(token),
        body: eventData
      });
      return await response.json();
    } catch (error) {
      return handleApiError(error, 'Failed to create event');
    }
  },

  // Music
  getSongs: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/songs`);
      return await response.json();
    } catch (error) {
      return handleApiError(error, 'Failed to fetch songs');
    }
  },

  createSong: async (songData: FormData) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/api/songs`, {
        method: 'POST',
        headers: getFormDataHeaders(token),
        body: songData
      });
      return await response.json();
    } catch (error) {
      return handleApiError(error, 'Failed to create song');
    }
  },

  // Podcasts
  getEpisodes: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/podcasts`);
      return await response.json();
    } catch (error) {
      return handleApiError(error, 'Failed to fetch episodes');
    }
  },

  createEpisode: async (episodeData: FormData) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/api/podcasts`, {
        method: 'POST',
        headers: getFormDataHeaders(token),
        body: episodeData
      });
      return await response.json();
    } catch (error) {
      return handleApiError(error, 'Failed to create episode');
    }
  },

  // Notifications
  getNotifications: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/notifications`, {
        headers: getAuthHeaders()
      });
      return await response.json();
    } catch (error) {
      return handleApiError(error, 'Failed to fetch notifications');
    }
  },

  markNotificationRead: async (notificationId: number) => {
    try {
      const response = await fetch(`${API_BASE}/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: getAuthHeaders()
      });
      return await response.json();
    } catch (error) {
      return handleApiError(error, 'Failed to mark notification read');
    }
  },

  // Messages
  getMessages: async (conversationId?: string) => {
    try {
      const url = conversationId 
        ? `${API_BASE}/api/messages?conversationId=${conversationId}`
        : `${API_BASE}/api/messages`;
      const response = await fetch(url, {
        headers: getAuthHeaders()
      });
      return await response.json();
    } catch (error) {
      return handleApiError(error, 'Failed to fetch messages');
    }
  },

  sendMessage: async (messageData: FormData) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/api/messages`, {
        method: 'POST',
        headers: getFormDataHeaders(token),
        body: messageData
      });
      return await response.json();
    } catch (error) {
      return handleApiError(error, 'Failed to send message');
    }
  }
};

// ========== UTILITY FUNCTIONS ==========
const getPath = () => {
    if (typeof window !== 'undefined') {
        return window.location.pathname;
    }
    return '/';
};

const parsePath = (path: string, users: User[]) => {
    if (path.startsWith('/@')) {
        const username = path.substring(2);
        const user = users.find(u => u.username === username || u.id.toString() === username);
        return { view: 'profile', username, userId: user?.id };
    }
    if (path.startsWith('/post/')) {
        return { view: 'single_post', postId: parseInt(path.substring(6), 10) };
    }
    
    // Main menu routes
    if (path === '/marketplace') return { view: 'marketplace' };
    if (path === '/reels') return { view: 'reels' };
    if (path === '/groups') return { view: 'groups' };
    if (path === '/brands') return { view: 'brands' };
    if (path === '/events') return { view: 'events' };
    if (path === '/birthdays') return { view: 'birthdays' };
    if (path === '/profiles') return { view: 'suggested_profiles' };
    if (path === '/suggested') return { view: 'suggested_profiles' };
    if (path === '/memories') return { view: 'memories' };
    if (path === '/music') return { view: 'music' };
    if (path === '/tools') return { view: 'tools' };
    
    // Bottom menu routes
    if (path === '/help') return { view: 'help_support' };
    if (path === '/settings') return { view: 'settings' };
    if (path === '/privacy') return { view: 'privacy_policy' };
    if (path === '/terms') return { view: 'terms_of_service' };
    
    return { view: 'home' };
};

const formatRelativeTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 0 || !timestamp) return 'Just now';
    
    const diffInSeconds = Math.floor(diff / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    const diffInWeeks = Math.floor(diffInDays / 7);
    const diffInMonths = Math.floor(diffInDays / 30);
    const diffInYears = Math.floor(diffInDays / 365);
    
    if (diffInSeconds < 60) {
        return diffInSeconds < 10 ? 'Just now' : `${diffInSeconds}s`;
    } else if (diffInMinutes < 60) {
        return `${diffInMinutes}m`;
    } else if (diffInHours < 24) {
        return `${diffInHours}h`;
    } else if (diffInDays < 7) {
        return `${diffInDays}d`;
    } else if (diffInDays < 30) {
        return `${diffInWeeks}w`;
    } else if (diffInDays < 365) {
        return `${diffInMonths}mo`;
    } else {
        return `${diffInYears}y`;
    }
};

// Helper function to get song for post
const getSongForPost = (post: PostType, songs: Song[], episodes: Episode[]) => {
    if (!post.audioTrack) return null;
    
    const song = songs.find(s => s.id === post.audioTrack?.id);
    if (song) {
        return {
            ...song,
            type: post.type === 'podcast' ? 'podcast' : 'music',
            plays: song.plays || post.audioTrack.plays || 0,
            likes: song.likes || post.audioTrack.likes || 0,
            shares: song.shares || post.audioTrack.shares || 0,
            comments: song.comments || 0,
            stats: {
                plays: song.plays || post.audioTrack.plays || 0,
                likes: song.likes || post.audioTrack.likes || 0,
                shares: song.shares || post.audioTrack.shares || 0,
                comments: song.comments || 0,
                downloads: 0,
                reelsUse: 0
            }
        };
    }
    
    const episode = episodes.find(e => e.id === post.audioTrack?.id);
    if (episode) {
        return {
            id: episode.id,
            title: episode.title,
            artist: episode.host || 'Podcast Host',
            cover: episode.thumbnail || episode.cover,
            audioUrl: episode.audioUrl,
            duration: episode.duration,
            uploaderId: episode.uploaderId,
            type: 'podcast',
            plays: episode.plays || post.audioTrack.plays || 0,
            likes: episode.likes || post.audioTrack.likes || 0,
            shares: episode.shares || post.audioTrack.shares || 0,
            comments: episode.comments || 0,
            description: episode.description,
            stats: {
                plays: episode.plays || post.audioTrack.plays || 0,
                likes: episode.likes || post.audioTrack.likes || 0,
                shares: episode.shares || post.audioTrack.shares || 0,
                comments: episode.comments || 0,
                downloads: 0,
                reelsUse: 0
            }
        };
    }
    
    return {
        id: post.audioTrack.id,
        title: post.audioTrack.title,
        artist: post.audioTrack.artist,
        cover: post.audioTrack.cover || '/default-cover.jpg',
        audioUrl: post.audioTrack.url,
        duration: post.audioTrack.duration,
        uploaderId: post.audioTrack.uploaderId,
        type: post.type === 'podcast' ? 'podcast' : 'music',
        plays: post.audioTrack.plays || 0,
        likes: post.audioTrack.likes || 0,
        shares: post.audioTrack.shares || 0,
        comments: 0,
        stats: {
            plays: post.audioTrack.plays || 0,
            likes: post.audioTrack.likes || 0,
            shares: post.audioTrack.shares || 0,
            comments: 0,
            downloads: 0,
            reelsUse: 0
        }
    };
};

const getAuthorForPost = (post: PostType, users: User[], brands: Brand[]) => {
    if (post.brandId) {
        const brand = brands.find(b => b.id === post.brandId);
        if (brand) {
            return {
                ...brand,
                type: 'brand' as const,
                name: brand.name,
                profileImage: brand.profileImage,
                isVerified: brand.isVerified,
                id: brand.id,
                followers: brand.followers || []
            };
        }
    }
    
    const brandByAuthorId = brands.find(b => b.id === post.authorId);
    if (brandByAuthorId) {
        return {
            ...brandByAuthorId,
            type: 'brand' as const,
            name: brandByAuthorId.name,
            profileImage: brandByAuthorId.profileImage,
            isVerified: brandByAuthorId.isVerified,
            id: brandByAuthorId.id,
            followers: brandByAuthorId.followers || []
        };
    }
    
    const user = users.find(u => u.id === post.authorId);
    if (user) {
        return {
            ...user,
            type: 'user' as const
        };
    }
    
    return null;
};

// Notification utility functions
const notificationExists = (notifications: Notification[], userId: number, senderId: number, type: string, postId?: number): boolean => {
    const recentTime = Date.now() - 300000; // 5 minutes
    return notifications.some(notif => 
        notif.userId === userId &&
        notif.senderId === senderId &&
        notif.type === type &&
        (postId ? notif.postId === postId : true) &&
        notif.timestamp > recentTime
    );
};

const createNotification = (
    userId: number,
    senderId: number,
    type: string,
    content: string,
    extraData?: {
        postId?: number;
        commentId?: number;
        reactionType?: ReactionType;
        groupId?: string;
        brandId?: number;
        eventId?: number;
        productId?: number;
        storyId?: number;
        reelId?: number;
        songId?: string;
        episodeId?: string;
        metadata?: any;
    }
): Notification => {
    return {
        id: Date.now() + Math.floor(Math.random() * 1000),
        userId,
        senderId,
        type: type as any,
        content,
        timestamp: Date.now(),
        read: false,
        ...extraData,
    };
};

// ========== IMAGE RENDERING UTILITIES ==========
const getImageGridClass = (imageCount: number): string => {
    switch (imageCount) {
        case 1:
            return 'w-full max-w-full h-auto';
        case 2:
            return 'grid grid-cols-2 gap-1 w-full';
        case 3:
            return 'grid grid-cols-2 gap-1 w-full';
        case 4:
            return 'grid grid-cols-2 gap-1 w-full';
        default:
            return imageCount > 4 ? 'grid grid-cols-2 gap-1 w-full' : 'w-full max-w-full h-auto';
    }
};

const getImageItemClass = (imageCount: number, index: number): string => {
    switch (imageCount) {
        case 1:
            return 'w-full max-w-full h-auto max-h-[500px] object-contain rounded-lg';
        case 2:
            return 'w-full h-full aspect-square object-cover rounded-lg';
        case 3:
            if (index === 0) return 'row-span-2 w-full h-full aspect-square object-cover rounded-lg';
            return 'w-full h-full aspect-square object-cover rounded-lg';
        case 4:
            return 'w-full h-full aspect-square object-cover rounded-lg';
        default:
            return 'w-full h-full aspect-square object-cover rounded-lg';
    }
};

// ========== MAIN APP COMPONENT ==========
export default function App({ initialData, initialPath }: { initialData?: any, initialPath?: string }) {
    const { t } = useLanguage();

    const [isClient, setIsClient] = useState(false);
    useEffect(() => {
        setIsClient(true);
    }, []);

    // State with API integration
    const [users, setUsers] = useState<User[]>([]);
    const [posts, setPosts] = useState<PostType[]>([]);
    const [stories, setStories] = useState<Story[]>([]);
    const [reels, setReels] = useState<Reel[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [songs, setSongs] = useState<Song[]>([]);
    const [episodes, setEpisodes] = useState<Episode[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [showRegister, setShowRegister] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [apiError, setApiError] = useState<string | null>(null);

    const serverPath = initialPath || '/';
    const clientPath = isClient ? getPath() : serverPath;
    const path = clientPath;
    
    const parsedPath = useMemo(() => parsePath(path, users), [path, users]);
    
    const [activeTab, setActiveTab] = useState(parsedPath.view === 'home' ? 'home' : parsedPath.view);
    const [view, setView] = useState(initialData?.view || parsedPath.view);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(initialData?.selectedUserId || parsedPath.userId || null);
    const [activeReelId, setActiveReelId] = useState<number | null>(null);
    const [activeBrandId, setActiveBrandId] = useState<number | null>(null);
    const [initialGroupIdToView, setInitialGroupIdToView] = useState<string | null>(null);
    const [activeTag, setActiveTag] = useState<string | null>(null);
    
    const [activeGroupComments, setActiveGroupComments] = useState<{groupId: string, postId: number} | null>(null);
    const [activeGroupShare, setActiveGroupShare] = useState<{groupId: string, postId: number} | null>(null);
    
    const [showCreateReelModal, setShowCreateReelModal] = useState(false);
    const [currentAudioTrack, setCurrentAudioTrack] = useState<AudioTrack | null>(null);
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    const [likedTracks, setLikedTracks] = useState<string[]>([]);
    const [playHistory, setPlayHistory] = useState<{trackId: string, timestamp: number, duration: number}[]>([]);

    const [showCreatePostModal, setShowCreatePostModal] = useState(false);
    const [showCreateStoryModal, setShowCreateStoryModal] = useState(false);
    const [showCreateEventModal, setShowCreateEventModal] = useState(false);
    const [activeStory, setActiveStory] = useState<Story | null>(null);
    const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
    const [activeCommentsPostId, setActiveCommentsPostId] = useState<number | null>(null);
    const [activeSharePostId, setActiveSharePostId] = useState<number | null>(null);
    const [activeChatUser, setActiveChatUser] = useState<User | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [activeProduct, setActiveProduct] = useState<Product | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [activeSinglePostId, setActiveSinglePostId] = useState<number | null>(initialData?.activeSinglePostId || parsedPath.postId || null);

    const isAdmin = currentUser?.role === 'admin';

    // ========== API INTEGRATION FUNCTIONS ==========
    const loadInitialData = useCallback(async () => {
        if (!isClient) return;
        
        try {
            setIsLoading(true);
            setApiError(null);
            
            // Check for existing auth token
            const authToken = localStorage.getItem('authToken');
            if (authToken) {
                // Load current user
                const userResult = await api.getCurrentUser();
                if (userResult.success) {
                    setCurrentUser(userResult.user);
                } else {
                    localStorage.removeItem('authToken');
                }
            }
            
            // Load all data in parallel
            const [
                usersResult,
                postsResult,
                storiesResult,
                reelsResult,
                eventsResult,
                productsResult,
                groupsResult,
                brandsResult,
                songsResult,
                episodesResult,
                notificationsResult
            ] = await Promise.all([
                api.getUsers(),
                api.getPosts(),
                api.getStories(),
                api.getReels(),
                api.getEvents(),
                api.getProducts(),
                api.getGroups(),
                api.getBrands(),
                api.getSongs(),
                api.getEpisodes(),
                authToken ? api.getNotifications() : Promise.resolve({ success: true, notifications: [] })
            ]);
            
            // Set all data
            if (usersResult.success) setUsers(usersResult.users);
            if (postsResult.success) setPosts(postsResult.posts.map((post: PostType) => ({
                ...post,
                formattedTime: formatRelativeTime(post.timestamp || post.createdAt || Date.now())
            })));
            if (storiesResult.success) setStories(storiesResult.stories);
            if (reelsResult.success) setReels(reelsResult.reels);
            if (eventsResult.success) setEvents(eventsResult.events);
            if (productsResult.success) setProducts(productsResult.products);
            if (groupsResult.success) setGroups(groupsResult.groups);
            if (brandsResult.success) setBrands(brandsResult.brands);
            if (songsResult.success) setSongs(songsResult.songs);
            if (episodesResult.success) setEpisodes(episodesResult.episodes);
            if (notificationsResult.success) setNotifications(notificationsResult.notifications);
            
        } catch (error) {
            setApiError('Failed to load data. Please refresh the page.');
            console.error('Initial data loading error:', error);
            
            // Fallback to initial data if API fails
            setUsers(INITIAL_USERS);
            setPosts(INITIAL_POSTS.map(post => ({
                ...post,
                formattedTime: formatRelativeTime(post.timestamp || post.createdAt || Date.now())
            })));
            setStories(INITIAL_STORIES);
            setReels(INITIAL_REELS);
            setEvents(INITIAL_EVENTS);
            setGroups(INITIAL_GROUPS);
            setBrands(INITIAL_BRANDS);
            setSongs(MOCK_SONGS);
            setEpisodes(MOCK_EPISODES);
            
        } finally {
            setIsLoading(false);
        }
    }, [isClient]);

    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);

    // Real-time polling for updates
    useEffect(() => {
        if (!currentUser) return;
        
        const pollInterval = setInterval(async () => {
            try {
                // Poll for new notifications
                const notificationsResult = await api.getNotifications();
                if (notificationsResult.success) {
                    setNotifications(notificationsResult.notifications);
                }
                
                // Poll for new posts (simplified - in production, use WebSockets or more efficient polling)
                const postsResult = await api.getPosts();
                if (postsResult.success) {
                    setPosts(postsResult.posts.map((post: PostType) => ({
                        ...post,
                        formattedTime: formatRelativeTime(post.timestamp || post.createdAt || Date.now())
                    })));
                }
                
            } catch (error) {
                console.error('Polling error:', error);
            }
        }, 30000); // Poll every 30 seconds
        
        return () => clearInterval(pollInterval);
    }, [currentUser]);

    const handleCreateNotification = useCallback((
        userId: number,
        senderId: number,
        type: string,
        content: string,
        extraData?: any
    ) => {
        if (userId === senderId) return;
        
        if (notificationExists(notifications, userId, senderId, type, extraData?.postId)) {
            return;
        }
        
        const newNotification = createNotification(userId, senderId, type, content, extraData);
        setNotifications(prev => [newNotification, ...prev]);
        
        // In production, send to API
        // api.createNotification({ userId, senderId, type, content, ...extraData });
    }, [notifications]);

    const handleLogin = async (email: string, pass: string) => {
        try {
            setLoginError('');
            const result = await api.login(email, pass);
            
            if (result.success) {
                setCurrentUser(result.user);
                localStorage.setItem('authToken', result.token);
                setView('home');
                setActiveTab('home');
                setShowRegister(false);
                setShowForgotPassword(false);
                
                // Reload data with authenticated user
                await loadInitialData();
                
                if (isClient) window.history.pushState({}, '', '/');
            } else {
                setLoginError(result.error || 'Invalid email or password');
            }
        } catch (error) {
            setLoginError('Network error. Please try again.');
        }
    };

    const handleRegister = async (newUser: Partial<User>) => {
        try {
            const result = await api.register(newUser);
            
            if (result.success) {
                // Auto-login after successful registration
                await handleLogin(newUser.email!, newUser.password!);
            } else {
                alert(result.error || 'Registration failed');
            }
        } catch (error) {
            alert('Registration failed. Please try again.');
        }
    };

    const handleLogout = async () => {
        try {
            await api.logout();
        } catch (error) {
            // Continue with logout even if API call fails
        }
        
        setCurrentUser(null);
        localStorage.removeItem('authToken');
        setView('login');
        setCurrentAudioTrack(null);
        setIsAudioPlaying(false);
        
        if (isClient) {
            window.history.pushState({}, '', '/');
        }
    };

    const handleCreatePost = async (
        text: string, 
        files: File[] | null, 
        type: any, 
        visibility: any, 
        location?: string, 
        feeling?: string, 
        taggedUsers?: number[], 
        background?: string, 
        linkPreview?: LinkPreview
    ) => {
        if (!currentUser) return;
        
        try {
            const formData = new FormData();
            formData.append('content', text);
            formData.append('type', type === 'multimage' ? 'image' : type);
            formData.append('visibility', visibility);
            if (location) formData.append('location', location);
            if (feeling) formData.append('feeling', feeling);
            if (background) formData.append('background', background);
            if (taggedUsers && taggedUsers.length > 0) {
                formData.append('taggedUsers', JSON.stringify(taggedUsers));
            }
            if (linkPreview) {
                formData.append('linkPreview', JSON.stringify(linkPreview));
            }
            
            if (files) {
                files.forEach(file => {
                    formData.append('files', file);
                });
            }
            
            const result = await api.createPost(formData);
            
            if (result.success) {
                const newPost = {
                    ...result.post,
                    formattedTime: formatRelativeTime(result.post.timestamp || Date.now())
                };
                
                setPosts(prev => [newPost, ...prev]);
                
                // Handle notifications for tagged users
                if (taggedUsers && taggedUsers.length > 0) {
                    taggedUsers.forEach(userId => {
                        if (userId !== currentUser.id) {
                            handleCreateNotification(
                                userId,
                                currentUser.id,
                                'tag_post',
                                'tagged you in a post.',
                                { postId: newPost.id }
                            );
                        }
                    });
                }
                
                // Handle mentions
                const mentionRegex = /@(\w+(?:\s\w+)?)/g;
                const mentions = [...text.matchAll(mentionRegex)];
                if (mentions.length > 0) {
                    const mentionedUserIds = new Set<number>();
                    mentions.forEach(match => {
                        const userName = match[1];
                        const user = users.find(u => u.name.toLowerCase() === userName.toLowerCase());
                        if (user && user.id !== currentUser.id && !taggedUsers?.includes(user.id)) {
                            mentionedUserIds.add(user.id);
                            handleCreateNotification(
                                user.id,
                                currentUser.id,
                                'mention_post',
                                'mentioned you in a post.',
                                { postId: newPost.id }
                            );
                        }
                    });
                }
                
                return newPost;
            } else {
                alert(result.error || 'Failed to create post');
            }
        } catch (error) {
            alert('Failed to create post. Please try again.');
        }
    };

    const handleReact = async (itemId: number, type: ReactionType) => {
        if (!currentUser) return alert("Please login to react.");
        
        try {
            const result = await api.reactToPost(itemId, type);
            
            if (result.success) {
                setPosts(prev => prev.map(post => {
                    if (post.id === itemId) {
                        const existing = post.reactions.find(r => r.userId === currentUser.id);
                        let newReactions = [...post.reactions];
                        
                        if (existing) {
                            if (existing.type === type) {
                                newReactions = newReactions.filter(r => r.userId !== currentUser.id);
                            } else {
                                newReactions = newReactions.map(r => 
                                    r.userId === currentUser.id ? { ...r, type } : r
                                );
                            }
                        } else {
                            newReactions.push({ userId: currentUser.id, type });
                            
                            if (post.authorId !== currentUser.id) {
                                handleCreateNotification(
                                    post.authorId,
                                    currentUser.id,
                                    `like_${type === 'like' ? 'post' : 'reaction'}`,
                                    type === 'like' ? 'liked your post.' : `reacted with ${type} to your post.`,
                                    { postId: itemId, reactionType: type }
                                );
                            }
                        }
                        
                        return { ...post, reactions: newReactions };
                    }
                    return post;
                }));
            }
        } catch (error) {
            console.error('Failed to react:', error);
        }
    };

    const handleComment = async (itemId: number, text: string, attachment?: any, parentId?: number) => {
        if (!currentUser) return;
        
        try {
            const result = await api.createComment(itemId, text, attachment, parentId);
            
            if (result.success) {
                const newComment = {
                    ...result.comment,
                    formattedTime: formatRelativeTime(result.comment.timestamp || Date.now()),
                    authorName: currentUser.name,
                    authorImage: currentUser.profileImage
                };
                
                setPosts(prev => prev.map(p => {
                    if (p.id === itemId) {
                        const updatedComments = [...p.comments, newComment];
                        
                        if (p.authorId !== currentUser.id) {
                            handleCreateNotification(
                                p.authorId,
                                currentUser.id,
                                'comment_post',
                                'commented on your post.',
                                { postId: itemId, commentId: newComment.id }
                            );
                        }
                        
                        // Handle mentions in comments
                        const mentionRegex = /@(\w+(?:\s\w+)?)/g;
                        const mentions = [...text.matchAll(mentionRegex)];
                        if (mentions.length > 0) {
                            mentions.forEach(match => {
                                const userName = match[1];
                                const user = users.find(u => u.name.toLowerCase() === userName.toLowerCase());
                                if (user && user.id !== currentUser.id) {
                                    handleCreateNotification(
                                        user.id,
                                        currentUser.id,
                                        'mention_comment',
                                        'mentioned you in a comment.',
                                        { postId: itemId, commentId: newComment.id }
                                    );
                                }
                            });
                        }
                        
                        return { ...p, comments: updatedComments };
                    }
                    return p;
                }));
                
                // Update comment count for music/podcast posts
                const post = posts.find(p => p.id === itemId);
                if (post && (post.type === 'music' || post.type === 'podcast') && post.audioTrack) {
                    const song = getSongForPost(post, songs, episodes);
                    if (song) {
                        handleTrackComment(song.id);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to create comment:', error);
        }
    };

    const handleDeletePost = async (postId: number) => {
        if (!currentUser) {
            alert("Please login to delete posts.");
            return;
        }
        
        const post = posts.find(p => p.id === postId);
        if (!post) {
            alert("Post not found.");
            return;
        }
        
        const canDelete = isAdmin || post.authorId === currentUser.id;
        if (!canDelete) {
            alert("You can only delete your own posts.");
            return;
        }
        
        if (window.confirm("Are you sure you want to delete this post?")) {
            try {
                const result = await api.deletePost(postId);
                
                if (result.success) {
                    setPosts(prev => prev.filter(p => p.id !== postId));
                    
                    if (post.brandId) {
                        setBrands(prev => prev.map(brand => ({
                            ...brand,
                            posts: brand.id === post.brandId 
                                ? (brand.posts || []).filter(id => id !== postId)
                                : (brand.posts || [])
                        })));
                    }
                    
                    if (post.groupId) {
                        setGroups(prev => prev.map(group => ({
                            ...group,
                            posts: group.id === post.groupId 
                                ? group.posts.filter(p => p.id !== postId)
                                : group.posts
                        })));
                    }
                    
                    alert("Post deleted successfully!");
                } else {
                    alert(result.error || "Failed to delete post");
                }
            } catch (error) {
                alert("Failed to delete post. Please try again.");
            }
        }
    };

    const handleCreateProduct = async (productData: Partial<Product>) => {
        if (!currentUser) {
            alert("Please login to create a product listing.");
            return;
        }

        try {
            const formData = new FormData();
            Object.entries(productData).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    if (key === 'images' && Array.isArray(value)) {
                        value.forEach(file => formData.append('images', file));
                    } else {
                        formData.append(key, String(value));
                    }
                }
            });

            const result = await api.createProduct(formData);
            
            if (result.success) {
                setProducts(prev => [...prev, result.product]);
                
                // Notify followers
                const followers = currentUser.followers || [];
                followers.forEach(followerId => {
                    if (followerId !== currentUser.id) {
                        handleCreateNotification(
                            followerId,
                            currentUser.id,
                            'product_post',
                            `listed a new product: "${result.product.title}"`,
                            { productId: result.product.id }
                        );
                    }
                });
                
                alert("Product listed successfully!");
                return result.product;
            } else {
                alert(result.error || 'Failed to create product');
            }
        } catch (error) {
            alert('Failed to create product. Please try again.');
        }
    };

    const handleCreateStory = async (storyData: Partial<Story>) => {
        if (!currentUser) return;
        
        try {
            const formData = new FormData();
            if (storyData.mediaUrl) {
                // Handle file upload
                const response = await fetch(storyData.mediaUrl);
                const blob = await response.blob();
                const file = new File([blob], 'story.jpg', { type: blob.type });
                formData.append('media', file);
            }
            if (storyData.caption) formData.append('caption', storyData.caption);
            if (storyData.type) formData.append('type', storyData.type);
            
            const result = await api.createStory(formData);
            
            if (result.success) {
                const newStory = {
                    ...result.story,
                    user: currentUser,
                    createdAt: Date.now()
                };
                setStories(prev => [newStory, ...prev]);
                setShowCreateStoryModal(false);
            }
        } catch (error) {
            alert('Failed to create story. Please try again.');
        }
    };

    const handleCreateReel = async (videoFile: File, caption: string, song?: Song | { name: string, url: string }, effectName?: string) => {
        if (!currentUser) return;
        
        try {
            const formData = new FormData();
            formData.append('video', videoFile);
            formData.append('caption', caption);
            if (song) formData.append('songName', 'title' in song ? song.title : song.name);
            if (effectName) formData.append('effectName', effectName);
            
            const result = await api.createReel(formData);
            
            if (result.success) {
                const newReel = {
                    ...result.reel,
                    createdAt: Date.now(),
                    reactions: [],
                    comments: [],
                    shares: 0
                };
                setReels(prev => [newReel, ...prev]);
                setShowCreateReelModal(false);
            }
        } catch (error) {
            alert('Failed to create reel. Please try again.');
        }
    };

    const handleCreateEvent = async (eventData: Partial<Event>) => {
        if (!currentUser) return;
        
        try {
            const formData = new FormData();
            Object.entries(eventData).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    formData.append(key, String(value));
                }
            });
            
            const result = await api.createEvent(formData);
            
            if (result.success) {
                const newEvent = {
                    ...result.event,
                    attendees: [currentUser.id],
                    interestedIds: []
                };
                setEvents(prev => [newEvent, ...prev]);
                
                // Create event post
                const eventPost: PostType = {
                    id: Date.now(),
                    authorId: currentUser.id,
                    content: `is hosting a new event: ${newEvent.title}`,
                    timestamp: Date.now(),
                    formattedTime: formatRelativeTime(Date.now()),
                    createdAt: Date.now(),
                    reactions: [],
                    comments: [],
                    shares: 0,
                    type: 'event',
                    visibility: 'Public',
                    event: newEvent,
                    eventId: newEvent.id
                };
                setPosts(prev => [eventPost, ...prev]);
            }
        } catch (error) {
            alert('Failed to create event. Please try again.');
        }
    };

    const handleFollowUser = async (userIdToToggle: number) => {
        if (!currentUser) {
            alert("Please login to follow users.");
            return;
        }
        
        const currentUserId = currentUser.id;
        const isCurrentlyFollowing = currentUser.following.includes(userIdToToggle);
        
        try {
            let result;
            if (isCurrentlyFollowing) {
                result = await api.unfollowUser(currentUserId, userIdToToggle);
            } else {
                result = await api.followUser(currentUserId, userIdToToggle);
                
                // Send notification
                if (result.success && userIdToToggle !== currentUserId) {
                    handleCreateNotification(
                        userIdToToggle,
                        currentUserId,
                        'follow',
                        'started following you.',
                        {}
                    );
                }
            }
            
            if (result.success) {
                // Update local state
                const newUsers = users.map(user => {
                    if (user.id === currentUserId) {
                        const updatedFollowing = isCurrentlyFollowing
                            ? user.following.filter(id => id !== userIdToToggle)
                            : [...user.following, userIdToToggle];
                        
                        const updatedUser = { 
                            ...user, 
                            following: updatedFollowing
                        };
                        
                        setCurrentUser(updatedUser);
                        return updatedUser;
                    }
                    
                    if (user.id === userIdToToggle) {
                        const updatedFollowers = isCurrentlyFollowing
                            ? user.followers.filter(id => id !== currentUserId)
                            : [...user.followers, currentUserId];
                        
                        return { 
                            ...user,
                            followers: updatedFollowers
                        };
                    }
                    
                    return user;
                });
                
                setUsers(newUsers);
            }
        } catch (error) {
            console.error('Failed to follow/unfollow user:', error);
        }
    };

    const handleCreateBrand = async (brandData: Partial<Brand>) => {
        if (!currentUser) {
            alert("Please login to create a brand page.");
            return;
        }
        
        try {
            const formData = new FormData();
            Object.entries(brandData).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    if (key === 'profileImage' || key === 'coverImage') {
                        // Handle image files
                        if (typeof value === 'string') {
                            // URL string
                            formData.append(key, value);
                        } else if (value instanceof File) {
                            // File object
                            formData.append(key, value);
                        }
                    } else {
                        formData.append(key, String(value));
                    }
                }
            });
            
            const result = await api.createBrand(formData);
            
            if (result.success) {
                const newBrand = result.brand;
                setBrands(prev => [newBrand, ...prev]);
                
                // Update user's following list
                if (currentUser) {
                    setCurrentUser(prev => prev ? {
                        ...prev,
                        following: [...prev.following, newBrand.id]
                    } : prev);
                    
                    setUsers(prev => prev.map(user => 
                        user.id === currentUser.id 
                            ? { ...user, following: [...user.following, newBrand.id] }
                            : user
                    ));
                }
                
                alert("Brand page created successfully!");
            } else {
                alert(result.error || 'Failed to create brand');
            }
        } catch (error) {
            alert('Failed to create brand. Please try again.');
        }
    };

    const handleAddSong = async (song: Song) => {
        try {
            const formData = new FormData();
            Object.entries(song).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    if (key === 'audioUrl' && value instanceof File) {
                        formData.append('audio', value);
                    } else if (key === 'cover' && value instanceof File) {
                        formData.append('cover', value);
                    } else {
                        formData.append(key, String(value));
                    }
                }
            });
            
            const result = await api.createSong(formData);
            
            if (result.success) {
                const newSong = result.song;
                setSongs(prev => [newSong, ...prev]);
                
                // Create a feed post for the new upload
                if (currentUser) {
                    const timestamp = Date.now();
                    const audioTrack: AudioTrack = {
                        id: newSong.id,
                        title: newSong.title,
                        artist: newSong.artist,
                        duration: newSong.duration || 180,
                        url: newSong.audioUrl || '',
                        uploaderId: newSong.uploaderId || currentUser.id,
                        cover: newSong.cover || '/default-cover.jpg',
                        type: 'music',
                        isVerified: true,
                        plays: newSong.plays || 0,
                        likes: newSong.likes || 0,
                        shares: newSong.shares || 0
                    };
                    
                    const newPost: PostType = {
                        id: timestamp,
                        authorId: currentUser.id,
                        content: `🎵 Just released new music: "${newSong.title}" by ${newSong.artist}`,
                        timestamp: timestamp,
                        formattedTime: formatRelativeTime(timestamp),
                        createdAt: timestamp,
                        reactions: [],
                        comments: [],
                        shares: 0,
                        views: 0,
                        type: 'music',
                        visibility: 'Public',
                        audioTrack: audioTrack
                    };
                    
                    setPosts(prev => [newPost, ...prev]);
                    
                    // Notify followers
                    const followers = currentUser.followers || [];
                    followers.forEach(followerId => {
                        if (followerId !== currentUser.id) {
                            handleCreateNotification(
                                followerId,
                                currentUser.id,
                                'music_post',
                                `released new music: "${newSong.title}"`,
                                { songId: newSong.id }
                            );
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Failed to add song:', error);
            alert('Failed to upload song. Please try again.');
        }
    };

    const handleCreateGroup = async (groupData: Partial<Group>) => {
        if (!currentUser) return;
        
        try {
            const formData = new FormData();
            Object.entries(groupData).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    if ((key === 'image' || key === 'coverImage') && value instanceof File) {
                        formData.append(key, value);
                    } else {
                        formData.append(key, String(value));
                    }
                }
            });
            
            const result = await api.createGroup(formData);
            
            if (result.success) {
                const newGroup = result.group;
                setGroups(prev => [newGroup, ...prev]);
                
                // Notify followers
                const followers = currentUser.followers || [];
                followers.forEach(followerId => {
                    if (followerId !== currentUser.id) {
                        handleCreateNotification(
                            followerId,
                            currentUser.id,
                            'group_created',
                            `created a new group: ${newGroup.name}`,
                            { groupId: newGroup.id }
                        );
                    }
                });
                
                alert("Group created successfully!");
            }
        } catch (error) {
            alert('Failed to create group. Please try again.');
        }
    };

    // ========== RENDER LOGIC ==========
    const storiesWithUsers = useMemo(() => {
        return stories.map(story => {
            const user = users.find(u => u.id === story.userId);
            return { ...story, user };
        }).sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
    }, [stories, users]);

    const rankedPosts = useMemo(() => {
        const processedPosts = posts.map(post => ({
            ...post,
            formattedTime: post.formattedTime || formatRelativeTime(post.timestamp || post.createdAt || Date.now())
        }));
        
        const productPosts: PostType[] = products.map(p => ({ 
            id: p.id + 100000, 
            authorId: p.sellerId, 
            content: `Just listed a new item: ${p.title}`, 
            timestamp: p.date || Date.now(),
            formattedTime: formatRelativeTime(p.date || Date.now()),
            createdAt: p.date || Date.now(), 
            reactions: [], 
            comments: [], 
            shares: 0, 
            views: p.views || 0, 
            type: 'product', 
            visibility: 'Public', 
            product: p, 
            productId: p.id 
        }));
        const reelPosts: PostType[] = reels.map(reel => ({ 
            id: reel.id + 200000, 
            authorId: reel.userId, 
            content: reel.caption || '', 
            video: reel.videoUrl, 
            timestamp: reel.createdAt || Date.now(),
            formattedTime: formatRelativeTime(reel.createdAt || Date.now()),
            createdAt: reel.createdAt || Date.now(), 
            reactions: reel.reactions || [], 
            comments: reel.comments || [], 
            shares: reel.shares || 0, 
            views: ((reel.reactions?.length || 0) * 10) + ((reel.shares || 0) * 5) + ((reel.comments?.length || 0) * 3), 
            type: 'video', 
            visibility: 'Public' 
        }));
        
        const allContent = [...processedPosts, ...productPosts, ...reelPosts];
        return rankFeed(allContent, currentUser, users, brands);
    }, [posts, reels, products, currentUser, users, brands]);

    const handleNavigate = (targetView: string) => {
        if (isClient) {
            const pathMap: { [key: string]: string } = {
                home: '/',
                marketplace: '/marketplace',
                reels: '/reels',
                groups: '/groups',
                brands: '/brands',
                events: '/events',
                birthdays: '/birthdays',
                profiles: '/profiles',
                suggested_profiles: '/suggested',
                memories: '/memories',
                music: '/music',
                tools: '/tools',
                help_support: '/help',
                settings: '/settings',
                privacy_policy: '/privacy',
                terms_of_service: '/terms',
                profile: currentUser ? `/@${currentUser.username || currentUser.id}` : '/login',
                create_event: '/create-event',
                brand_view: '/brands',
            };
            window.history.pushState({}, '', pathMap[targetView] || '/');
        }

        setActiveTag(null);
        if (targetView.startsWith('post-')) {
            const postId = parseInt(targetView.split('-')[1]);
            setActiveSinglePostId(postId);
            setView('single_post');
            return;
        }

        setActiveReelId(null);
        setActiveBrandId(null);
        setInitialGroupIdToView(null);
        setActiveGroupComments(null);
        setActiveGroupShare(null);

        switch(targetView) {
            case 'home':
                setView('home');
                setActiveTab('home');
                break;
            case 'marketplace':
                setView('marketplace');
                setActiveTab('marketplace');
                break;
            case 'reels':
                setView('reels');
                setActiveTab('reels');
                break;
            case 'groups':
                setView('groups');
                setActiveTab('groups');
                break;
            case 'brands':
                setView('brands');
                setActiveTab('brands');
                break;
            case 'events':
                setView('events');
                setActiveTab('events');
                break;
            case 'birthdays':
                setView('birthdays');
                setActiveTab('birthdays');
                break;
            case 'profiles':
            case 'suggested_profiles':
                setView('suggested_profiles');
                setActiveTab('suggested');
                break;
            case 'memories':
                setView('memories');
                setActiveTab('memories');
                break;
            case 'music':
                setView('music');
                setActiveTab('music');
                break;
            case 'tools':
                setView('tools');
                setActiveTab('tools');
                break;
            case 'help_support':
                setView('help_support');
                setActiveTab('help');
                break;
            case 'settings':
                setView('settings');
                setActiveTab('settings');
                break;
            case 'privacy_policy':
                setView('privacy_policy');
                setActiveTab('privacy');
                break;
            case 'terms_of_service':
                setView('terms_of_service');
                setActiveTab('terms');
                break;
            case 'profile':
                if (currentUser) {
                    setSelectedUserId(currentUser.id);
                    setView('profile');
                    setActiveTab('profile');
                } else {
                    setView('login');
                }
                break;
            case 'create_event':
                if (currentUser) {
                    setShowCreateEventModal(true);
                } else {
                    setView('login');
                }
                break;
            case 'brand_view':
                setView('brands');
                setActiveTab('brands');
                break;
            default:
                setView(targetView);
                setActiveTab('home');
        }
    };

    const renderMusicPost = (post: PostType, author: any) => {
        const song = getSongForPost(post, songs, episodes);
        if (!song) return null;
        
        return (
            <MusicFeedPost 
                key={post.id}
                song={song}
                currentUser={currentUser}
                users={users}
                onPlayTrack={handlePlayTrack}
                onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }}
                onLikeTrack={handleLikeTrack}
                onTrackComment={handleTrackComment}
                onTrackShare={handleTrackShare}
                isLiked={likedTracks.includes(song.id)}
            />
        );
    };

    const renderRegularPost = (post: PostType, author: any, isFollowing?: boolean) => {
        const isBrandAuthor = author?.type === 'brand';
        const isFollowingBrand = isBrandAuthor && currentUser ? 
            brands.find(b => b.id === author.id)?.followers.includes(currentUser.id) || false : 
            false;
        
        const postWithFormattedTime = {
            ...post,
            formattedTime: post.formattedTime || formatRelativeTime(post.timestamp || post.createdAt || Date.now()),
            images: post.images ? post.images : undefined
        };
        
        return (
            <Post 
                key={post.id} 
                post={postWithFormattedTime}
                author={author as any} 
                currentUser={currentUser} 
                users={users} 
                onProfileClick={(id) => { 
                    if (isBrandAuthor) {
                        setActiveBrandId(id);
                        handleNavigate('brand_view');
                    } else {
                        setSelectedUserId(id); 
                        setView('profile');
                    }
                }} 
                onReact={handleReact} 
                onShare={(id) => setActiveSharePostId(id)} 
                onViewImage={(url) => setFullScreenImage(url)} 
                onOpenComments={(postId) => setActiveCommentsPostId(postId)} 
                onVideoClick={(p) => { setActiveReelId(p.id - 200000); setView('reels'); }} 
                onViewProduct={(p) => setActiveProduct(p)} 
                onGroupClick={(groupId) => { setInitialGroupIdToView(groupId); setView('groups'); setActiveTab('groups'); }} 
                onPlayAudioTrack={handlePlayTrack} 
                onFollow={isBrandAuthor ? handleFollowBrand : handleFollowUser} 
                isFollowing={isBrandAuthor ? isFollowingBrand : isFollowing} 
                onHashtagClick={handleTagClick} 
                onDeletePost={handleDeletePost} 
                isAdmin={isAdmin}
                getImageGridClass={getImageGridClass}
                getImageItemClass={getImageItemClass}
            />
        );
    };
    
    const effectiveView = isClient ? view : (initialData?.view || parsedPath.view);
    
    return (
        <div className="bg-[#18191A] min-h-screen flex flex-col font-sans">
            {apiError && (
                <div className="bg-red-500 text-white p-2 text-center">
                    {apiError}
                    <button 
                        onClick={loadInitialData}
                        className="ml-4 underline"
                    >
                        Retry
                    </button>
                </div>
            )}
            
            {isLoading ? (
                <div className="flex items-center justify-center min-h-screen bg-[#18191A] flex-col">
                    <div className="w-20 h-20 border-4 border-[#1877F2] border-t-transparent rounded-full animate-spin mb-4"></div>
                    <div className="text-[#1877F2] font-bold text-xl animate-pulse">Loading UNERA...</div>
                </div>
            ) : effectiveView === 'login' ? (
                 showRegister 
                    ? <Register onRegister={handleRegister} onBackToLogin={() => { setShowRegister(false); setShowForgotPassword(false); }} /> 
                    : showForgotPassword
                    ? <ForgotPassword onBackToLogin={() => { setShowForgotPassword(false); setShowRegister(false); }} />
                    : <Login onLogin={handleLogin} onNavigateToRegister={() => { setShowRegister(true); setShowForgotPassword(false); }} onNavigateToForgotPassword={() => { setShowForgotPassword(true); setShowRegister(false); }} onClose={() => { setView('home'); setCurrentUser(null); }} error={loginError} />
            ) : (
                <>
                    {currentAudioTrack && (
                        <GlobalAudioPlayer 
                            currentTrack={currentAudioTrack} 
                            isPlaying={isAudioPlaying} 
                            onTogglePlay={() => setIsAudioPlaying(!isAudioPlaying)} 
                            onNext={() => {}} 
                            onPrevious={() => {}} 
                            onClose={() => { setCurrentAudioTrack(null); setIsAudioPlaying(false); }} 
                            onDownload={() => alert("Download started...")} 
                            onLike={(id) => setLikedTracks(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])} 
                            isLiked={likedTracks.includes(currentAudioTrack.id)} 
                            uploaderProfile={users.find(u => u.id === currentAudioTrack.uploaderId)} 
                            onArtistClick={(id) => { setSelectedUserId(id); setView('profile'); }} 
                        />
                    )}
                    
                    <Header 
                        onHomeClick={() => handleNavigate('home')} 
                        onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} 
                        onReelsClick={() => handleNavigate('reels')} 
                        onMarketplaceClick={() => handleNavigate('marketplace')} 
                        onGroupsClick={() => handleNavigate('groups')} 
                        currentUser={currentUser} 
                        notifications={notifications} 
                        users={users} 
                        onLogout={handleLogout} 
                        onLoginClick={() => setView('login')} 
                        onMarkNotificationsRead={() => {}} 
                        onNotificationClick={handleNotificationClick}
                        activeTab={activeTab} 
                        onNavigate={handleNavigate} 
                    />
                    
                    <div className="flex justify-center w-full max-w-[1920px] mx-auto relative flex-1">
                        <div className="sticky top-14 h-[calc(100vh-56px)] z-20 hidden lg:block">
                            <Sidebar 
                                currentUser={currentUser || INITIAL_USERS[0]} 
                                onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} 
                                onReelsClick={() => handleNavigate('reels')} 
                                onMarketplaceClick={() => handleNavigate('marketplace')} 
                                onGroupsClick={() => handleNavigate('groups')} 
                            />
                        </div>
                        
                        <div className="w-full lg:w-[740px] xl:w-[700px] min-h-screen">
                            {effectiveView === 'home' && (
                                <div className="w-full pt-4 md:px-8 pb-10">
                                    <StoryReel 
                                        stories={storiesWithUsers} 
                                        onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} 
                                        onCreateStory={() => currentUser ? setShowCreateStoryModal(true) : setView('login')} 
                                        onViewStory={(s) => setActiveStory(s)} 
                                        currentUser={currentUser} 
                                        onRequestLogin={() => setView('login')} 
                                    />
                                    
                                    {currentUser && (
                                        <> 
                                            <CreatePost 
                                                currentUser={currentUser} 
                                                onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} 
                                                onClick={() => setShowCreatePostModal(true)} 
                                                onCreateEventClick={() => setShowCreateEventModal(true)} 
                                            /> 
                                            <SuggestedProductsWidget 
                                                products={products} 
                                                currentUser={currentUser} 
                                                onViewProduct={(p) => { setActiveProduct(p); }} 
                                                onSeeAll={() => handleNavigate('marketplace')} 
                                            /> 
                                        </>
                                    )}
                                    
                                    {rankedPosts.map(post => {
                                        const author = getAuthorForPost(post, users, brands);
                                        if (!author) return null;
                                        
                                        let isFollowing = false;
                                        if (author.type === 'user' && currentUser) {
                                            isFollowing = currentUser.following.includes(author.id);
                                        } else if (author.type === 'brand' && currentUser) {
                                            const brand = brands.find(b => b.id === author.id);
                                            isFollowing = brand ? brand.followers.includes(currentUser.id) : false;
                                        }
                                        
                                        if ((post.type === 'music' || post.type === 'podcast') && post.audioTrack) {
                                            return renderMusicPost(post, author);
                                        }
                                        
                                        return renderRegularPost(post, author, isFollowing);
                                    })}
                                </div>
                            )}
                            
                            {/* Other views remain similar with API integration */}
                            {effectiveView === 'profile' && selectedUserId !== null && (
                                <UserProfile 
                                    user={users.find(u => u.id === selectedUserId)!} 
                                    currentUser={currentUser} 
                                    users={users} 
                                    posts={(() => {
                                        const userPosts = posts.filter(p => p.authorId === selectedUserId);
                                        const enhancedPosts = userPosts.map(post => ({
                                            ...post,
                                            formattedTime: post.formattedTime || formatRelativeTime(post.timestamp || post.createdAt || Date.now())
                                        }));
                                        
                                        return [
                                            ...enhancedPosts,
                                            ...products
                                                .filter(p => p.sellerId === selectedUserId)
                                                .map(p => ({
                                                    id: p.id + 100000,
                                                    authorId: p.sellerId,
                                                    content: `Just listed a new item: ${p.title}`,
                                                    timestamp: p.date || Date.now(),
                                                    formattedTime: formatRelativeTime(p.date || Date.now()),
                                                    createdAt: p.date || Date.now(),
                                                    reactions: [],
                                                    comments: [],
                                                    shares: 0,
                                                    views: p.views || 0,
                                                    type: 'product' as const,
                                                    visibility: 'Public' as const,
                                                    product: p,
                                                    productId: p.id
                                                }))
                                        ];
                                    })()}
                                    onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} 
                                    onFollow={handleFollowUser} 
                                    onReact={handleReact} 
                                    onComment={handleComment} 
                                    onShare={(id) => setActiveSharePostId(id)} 
                                    onMessage={(id) => setActiveChatUser(users.find(u => u.id === id) || null)} 
                                    onCreatePost={handleCreatePost} 
                                    onUpdateProfileImage={(f) => {}} 
                                    onUpdateCoverImage={(f) => {}} 
                                    onUpdateUserDetails={(d) => {}} 
                                    onDeletePost={handleDeletePost} 
                                    onEditPost={() => {}} 
                                    getCommentAuthor={(id) => users.find(u => u.id === id)} 
                                    onViewImage={setFullScreenImage} 
                                    onOpenComments={setActiveCommentsPostId} 
                                    onVideoClick={() => {}} 
                                    onCreateEventClick={() => setShowCreateEventModal(true)} 
                                    onPlayAudioTrack={handlePlayTrack} 
                                    onVerifyUser={() => {}} 
                                    onRestrictUser={() => {}} 
                                    onDeleteUser={() => {}} 
                                    onMakeModerator={() => {}} 
                                    onHashtagClick={handleTagClick} 
                                    songs={songs}
                                    episodes={episodes}
                                    likedTracks={likedTracks}
                                    onLikeTrack={handleLikeTrack}
                                    onTrackComment={handleTrackComment}
                                    onTrackShare={handleTrackShare}
                                    renderMusicPost={renderMusicPost}
                                    renderRegularPost={renderRegularPost}
                                    getImageGridClass={getImageGridClass}
                                    getImageItemClass={getImageItemClass}
                                />
                            )}
                            
                            {/* Other views (marketplace, reels, groups, etc.) would be similarly integrated */}
                            
                        </div>
                        
                        <div className="sticky top-14 h-[calc(100vh-56px)] z-20 hidden xl:block pl-4">
                            <RightSidebar 
                                contacts={users.filter(u => u.id !== currentUser?.id)} 
                                onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} 
                            />
                        </div>
                    </div>
                    
                    {/* Modals */}
                    {showCreatePostModal && currentUser && (
                        <CreatePostModal 
                            currentUser={currentUser} 
                            users={users} 
                            onClose={() => setShowCreatePostModal(false)} 
                            onCreatePost={handleCreatePost} 
                        />
                    )}
                    
                    {showCreateStoryModal && currentUser && (
                        <CreateStoryModal 
                            currentUser={currentUser} 
                            songs={songs} 
                            onClose={() => setShowCreateStoryModal(false)} 
                            onCreate={handleCreateStory} 
                        />
                    )}
                    
                    {showCreateReelModal && currentUser && (
                        <CreateReelModal 
                            currentUser={currentUser} 
                            songs={songs} 
                            onClose={() => setShowCreateReelModal(false)} 
                            onSubmit={handleCreateReel} 
                        />
                    )}
                    
                    {showCreateEventModal && currentUser && (
                        <CreateEventModal 
                            currentUser={currentUser} 
                            onClose={() => setShowCreateEventModal(false)} 
                            onCreate={handleCreateEvent} 
                        />
                    )}
                    
                    {/* Comments and other modals */}
                </>
            )}
        </div>
    );
}
