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

// ========== API CONFIGURATION ==========
const API_BASE_URL = 'https://unera.social';

// Professional API service with error handling
class APIService {
  private baseURL: string;
  
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  private async fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 8000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  }

  private async handleResponse(response: Response) {
    if (!response.ok) {
      if (response.status === 401) {
        // Clear invalid session
        localStorage.removeItem('authToken');
        localStorage.removeItem('universeCurrentUser');
        throw new Error('Session expired. Please login again.');
      }
      throw new Error(`API Error: ${response.status}`);
    }

    try {
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to parse JSON:', error);
      return { success: false, error: 'Invalid JSON response' };
    }
  }

  private getHeaders(withAuth = false) {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (withAuth) {
      const token = localStorage.getItem('authToken');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  // ========== PUBLIC API METHODS ==========
  async getPublicPosts() {
    try {
      const response = await this.fetchWithTimeout(`${this.baseURL}/api/posts/public`, {
        headers: this.getHeaders(false),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Failed to fetch public posts:', error);
      return { success: false, data: [], error: 'Failed to load posts' };
    }
  }

  async getUsers() {
    try {
      const response = await this.fetchWithTimeout(`${this.baseURL}/api/users`, {
        headers: this.getHeaders(false),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      return { success: false, data: [], error: 'Failed to load users' };
    }
  }

  async getBrands() {
    try {
      const response = await this.fetchWithTimeout(`${this.baseURL}/api/brands`, {
        headers: this.getHeaders(false),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Failed to fetch brands:', error);
      return { success: false, data: [], error: 'Failed to load brands' };
    }
  }

  async getMusic() {
    try {
      const response = await this.fetchWithTimeout(`${this.baseURL}/api/music`, {
        headers: this.getHeaders(false),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Failed to fetch music:', error);
      return { success: false, data: [], error: 'Failed to load music' };
    }
  }

  async getGroups() {
    try {
      const response = await this.fetchWithTimeout(`${this.baseURL}/api/groups`, {
        headers: this.getHeaders(false),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
      return { success: false, data: [], error: 'Failed to load groups' };
    }
  }

  async getProducts() {
    try {
      const response = await this.fetchWithTimeout(`${this.baseURL}/api/products`, {
        headers: this.getHeaders(false),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      return { success: false, data: [], error: 'Failed to load products' };
    }
  }

  // ========== AUTH API METHODS ==========
  async login(email: string, password: string) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseURL}/api/auth/login`, {
        method: 'POST',
        headers: this.getHeaders(false),
        body: JSON.stringify({ email, password }),
      });
      const data = await this.handleResponse(response);
      
      if (data.success && data.token) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('universeCurrentUser', JSON.stringify(data.user));
      }
      
      return data;
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: 'Login failed. Please try again.' };
    }
  }

  async register(userData: any) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseURL}/api/auth/register`, {
        method: 'POST',
        headers: this.getHeaders(false),
        body: JSON.stringify(userData),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Registration failed:', error);
      return { success: false, error: 'Registration failed. Please try again.' };
    }
  }

  async verifyToken() {
    const token = localStorage.getItem('authToken');
    if (!token) {
      return { success: false, error: 'No token found' };
    }

    try {
      const response = await this.fetchWithTimeout(`${this.baseURL}/api/auth/verify`, {
        headers: this.getHeaders(true),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Token verification failed:', error);
      return { success: false, error: 'Token verification failed' };
    }
  }

  // ========== POST API METHODS ==========
  async createPost(postData: any) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseURL}/api/posts`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify(postData),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Failed to create post:', error);
      return { success: false, error: 'Failed to create post' };
    }
  }

  async deletePost(postId: number) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseURL}/api/posts/${postId}`, {
        method: 'DELETE',
        headers: this.getHeaders(true),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Failed to delete post:', error);
      return { success: false, error: 'Failed to delete post' };
    }
  }

  async reactToPost(postId: number, reactionType: string) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseURL}/api/posts/${postId}/react`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify({ reactionType }),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Failed to react to post:', error);
      return { success: false, error: 'Failed to react to post' };
    }
  }

  async commentOnPost(postId: number, commentData: any) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseURL}/api/posts/${postId}/comment`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify(commentData),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Failed to comment on post:', error);
      return { success: false, error: 'Failed to comment on post' };
    }
  }

  // ========== BRAND API METHODS ==========
  async createBrand(brandData: any) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseURL}/api/brands`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify(brandData),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Failed to create brand:', error);
      return { success: false, error: 'Failed to create brand' };
    }
  }

  async followBrand(brandId: number) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseURL}/api/brands/${brandId}/follow`, {
        method: 'POST',
        headers: this.getHeaders(true),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Failed to follow brand:', error);
      return { success: false, error: 'Failed to follow brand' };
    }
  }

  // ========== GROUP API METHODS ==========
  async createGroup(groupData: any) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseURL}/api/groups`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify(groupData),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Failed to create group:', error);
      return { success: false, error: 'Failed to create group' };
    }
  }

  async joinGroup(groupId: string) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseURL}/api/groups/${groupId}/join`, {
        method: 'POST',
        headers: this.getHeaders(true),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Failed to join group:', error);
      return { success: false, error: 'Failed to join group' };
    }
  }

  // ========== PRODUCT API METHODS ==========
  async createProduct(productData: any) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseURL}/api/products`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify(productData),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Failed to create product:', error);
      return { success: false, error: 'Failed to create product' };
    }
  }

  // ========== MUSIC API METHODS ==========
  async uploadSong(songData: any) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseURL}/api/music/upload`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify(songData),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Failed to upload song:', error);
      return { success: false, error: 'Failed to upload song' };
    }
  }
}

// Initialize API service
const apiService = new APIService();

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

// Enhanced Facebook-style relative time formatter
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

// Data transformation functions
const transformPostFromAPI = (apiPost: any): PostType => {
    const timestamp = new Date(apiPost.created_at || apiPost.timestamp).getTime() || Date.now();
    
    return {
        id: apiPost.id,
        authorId: apiPost.user_id || apiPost.authorId || 1,
        content: apiPost.content || '',
        images: apiPost.images || (apiPost.media_url && apiPost.media_type === 'image' ? [apiPost.media_url] : undefined),
        video: apiPost.video || (apiPost.media_url && apiPost.media_type === 'video' ? apiPost.media_url : undefined),
        timestamp: timestamp,
        formattedTime: formatRelativeTime(timestamp),
        createdAt: timestamp,
        reactions: apiPost.reactions || [],
        comments: apiPost.comments || [],
        shares: apiPost.shares || 0,
        views: apiPost.views || 0,
        type: apiPost.type || apiPost.media_type || 'text',
        visibility: apiPost.visibility || 'Public',
        location: apiPost.location,
        feeling: apiPost.feeling,
        taggedUsers: apiPost.tagged_users,
        background: apiPost.background,
        linkPreview: apiPost.link_preview,
        brandId: apiPost.brand_id,
        groupId: apiPost.group_id,
        eventId: apiPost.event_id,
        productId: apiPost.product_id,
        audioTrack: apiPost.audio_track
    };
};

const transformUserFromAPI = (apiUser: any): User => {
    return {
        id: apiUser.id,
        name: apiUser.name || `User ${apiUser.id}`,
        email: apiUser.email || '',
        username: apiUser.username || `user${apiUser.id}`,
        password: apiUser.password || '',
        profileImage: apiUser.profile_image || apiUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(apiUser.name || 'User')}&background=random`,
        coverImage: apiUser.cover_image || 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f',
        bio: apiUser.bio || '',
        location: apiUser.location || '',
        followers: apiUser.followers || [],
        following: apiUser.following || [],
        posts: apiUser.posts || [],
        isVerified: apiUser.is_verified || false,
        isRestricted: apiUser.is_restricted || false,
        role: apiUser.role || 'user',
        birthDate: apiUser.birth_date,
        joinedDate: apiUser.created_at || apiUser.joined_date || new Date().toISOString()
    };
};

const transformBrandFromAPI = (apiBrand: any): Brand => {
    return {
        id: apiBrand.id,
        name: apiBrand.name || 'Brand',
        category: apiBrand.category || 'Business',
        description: apiBrand.description || '',
        location: apiBrand.location || '',
        website: apiBrand.website || '',
        contactEmail: apiBrand.contact_email || apiBrand.contactEmail || '',
        contactPhone: apiBrand.contact_phone || apiBrand.contactPhone || '',
        adminId: apiBrand.admin_id || apiBrand.adminId || 1,
        followers: apiBrand.followers || [],
        isVerified: apiBrand.is_verified || apiBrand.isVerified || false,
        posts: apiBrand.posts || [],
        createdAt: apiBrand.created_at || apiBrand.createdAt || Date.now(),
        profileImage: apiBrand.profile_image || apiBrand.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(apiBrand.name || 'Brand')}&background=random&size=150`,
        coverImage: apiBrand.cover_image || apiBrand.coverImage || 'https://images.unsplash.com/photo-1557683316-973673baf926?ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80'
    };
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
            comments: song.comments || 0
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
            comments: episode.comments || 0
        };
    }
    
    return null;
};

// Helper function to get author (user or brand) for a post
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
    extraData?: any
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
        case 1: return 'w-full max-w-full h-auto';
        case 2: return 'grid grid-cols-2 gap-1 w-full';
        case 3: return 'grid grid-cols-2 gap-1 w-full';
        case 4: return 'grid grid-cols-2 gap-1 w-full';
        default: return imageCount > 4 ? 'grid grid-cols-2 gap-1 w-full' : 'w-full max-w-full h-auto';
    }
};

const getImageItemClass = (imageCount: number, index: number): string => {
    switch (imageCount) {
        case 1: return 'w-full max-w-full h-auto max-h-[500px] object-contain rounded-lg';
        case 2: return 'w-full h-full aspect-square object-cover rounded-lg';
        case 3:
            if (index === 0) return 'row-span-2 w-full h-full aspect-square object-cover rounded-lg';
            return 'w-full h-full aspect-square object-cover rounded-lg';
        case 4: return 'w-full h-full aspect-square object-cover rounded-lg';
        default: return 'w-full h-full aspect-square object-cover rounded-lg';
    }
};

// ========== MAIN APP COMPONENT ==========
export default function App({ initialData, initialPath }: { initialData?: any, initialPath?: string }) {
    const { t } = useLanguage();

    const [isClient, setIsClient] = useState(false);
    useEffect(() => {
        setIsClient(true);
    }, []);

    // ========== STATE MANAGEMENT ==========
    // Start with initial data for immediate display
    const [users, setUsers] = useState<User[]>(INITIAL_USERS);
    const [posts, setPosts] = useState<PostType[]>(() => {
        return INITIAL_POSTS.map(post => ({
            ...post,
            formattedTime: post.formattedTime || formatRelativeTime(post.timestamp || post.createdAt || Date.now())
        }));
    });
    const [stories, setStories] = useState<Story[]>(INITIAL_STORIES);
    const [reels, setReels] = useState<Reel[]>(INITIAL_REELS);
    const [events, setEvents] = useState<Event[]>(INITIAL_EVENTS);
    const [products, setProducts] = useState<Product[]>([]);
    const [groups, setGroups] = useState<Group[]>(INITIAL_GROUPS);
    const [brands, setBrands] = useState<Brand[]>(INITIAL_BRANDS);
    const [songs, setSongs] = useState<Song[]>(MOCK_SONGS);
    const [episodes, setEpisodes] = useState<Episode[]>(MOCK_EPISODES);
    
    // CRITICAL: Start as guest (null) - NOT auto-logged in as admin
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [showRegister, setShowRegister] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [apiLoading, setApiLoading] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    
    const serverPath = initialPath || '/';
    const clientPath = isClient ? getPath() : serverPath;
    const path = clientPath;
    
    const parsedPath = useMemo(() => parsePath(path, users), [path, users]);
    
    const [activeTab, setActiveTab] = useState(parsedPath.view === 'home' ? 'home' : parsedPath.view);
    const [view, setView] = useState(parsedPath.view);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(parsedPath.userId || null);
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
    const [notifications, setNotifications] = useState<Notification[]>([
        {
            id: 1,
            userId: 1,
            senderId: 2,
            type: 'follow',
            content: 'started following you.',
            timestamp: Date.now() - 3600000,
            read: false
        }
    ]);
    const [activeProduct, setActiveProduct] = useState<Product | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [activeSinglePostId, setActiveSinglePostId] = useState<number | null>(parsedPath.postId || null);

    const isAdmin = currentUser?.role === 'admin';

    const storiesWithUsers = useMemo(() => {
        return stories.map(story => {
            const user = users.find(u => u.id === story.userId);
            return { ...story, user };
        }).sort((a,b) => b.createdAt - a.createdAt);
    }, [stories, users]);

    // Enhanced ranked posts
    const rankedPosts = useMemo(() => {
        const processedPosts = posts.map(post => ({
            ...post,
            formattedTime: post.formattedTime || formatRelativeTime(post.timestamp || post.createdAt || Date.now())
        }));
        
        const productPosts: PostType[] = products.map(p => ({ 
            id: p.id + 100000, 
            authorId: p.sellerId, 
            content: `Just listed a new item: ${p.title}`, 
            timestamp: p.date,
            formattedTime: formatRelativeTime(p.date),
            createdAt: p.date, 
            reactions: [], 
            comments: [], 
            shares: 0, 
            views: p.views, 
            type: 'product', 
            visibility: 'Public', 
            product: p, 
            productId: p.id 
        }));
        
        const reelPosts: PostType[] = reels.map(reel => ({ 
            id: reel.id + 200000, 
            authorId: reel.userId, 
            content: reel.caption, 
            video: reel.videoUrl, 
            timestamp: reel.createdAt,
            formattedTime: formatRelativeTime(reel.createdAt),
            createdAt: reel.createdAt, 
            reactions: reel.reactions, 
            comments: reel.comments, 
            shares: reel.shares, 
            views: (reel.reactions.length * 10) + (reel.shares * 5) + (reel.comments.length * 3), 
            type: 'video', 
            visibility: 'Public' 
        }));
        
        const allContent = [...processedPosts, ...productPosts, ...reelPosts];
        return rankFeed(allContent, currentUser, users, brands);
    }, [posts, reels, products, currentUser, users, brands]);

    // ========== API DATA FETCHING ==========
    useEffect(() => {
        const fetchInitialData = async () => {
            if (!isClient) return;
            
            // Check for existing session
            const token = localStorage.getItem('authToken');
            const storedUser = localStorage.getItem('universeCurrentUser');
            
            if (token && storedUser) {
                try {
                    const verification = await apiService.verifyToken();
                    if (verification.success && verification.user) {
                        const user = transformUserFromAPI(verification.user);
                        setCurrentUser(user);
                        console.log('Auto-login from valid token');
                    } else {
                        // Clear invalid session
                        localStorage.removeItem('authToken');
                        localStorage.removeItem('universeCurrentUser');
                    }
                } catch (error) {
                    console.log('Token verification failed, staying as guest');
                }
            }

            // Fetch public data
            setApiLoading(true);
            setApiError(null);
            
            try {
                // Fetch data in parallel for better performance
                const [
                    postsResponse,
                    usersResponse,
                    brandsResponse,
                    musicResponse,
                    groupsResponse,
                    productsResponse
                ] = await Promise.allSettled([
                    apiService.getPublicPosts(),
                    apiService.getUsers(),
                    apiService.getBrands(),
                    apiService.getMusic(),
                    apiService.getGroups(),
                    apiService.getProducts()
                ]);

                // Process posts
                if (postsResponse.status === 'fulfilled' && postsResponse.value.success) {
                    const postsData = Array.isArray(postsResponse.value) ? postsResponse.value : postsResponse.value.data || [];
                    if (postsData.length > 0) {
                        const transformedPosts = postsData.map(transformPostFromAPI);
                        setPosts(transformedPosts);
                        console.log('Loaded', transformedPosts.length, 'posts from API');
                    }
                }

                // Process users
                if (usersResponse.status === 'fulfilled' && usersResponse.value.success) {
                    const usersData = Array.isArray(usersResponse.value) ? usersResponse.value : usersResponse.value.data || [];
                    if (usersData.length > 0) {
                        const transformedUsers = usersData.map(transformUserFromAPI);
                        setUsers(transformedUsers);
                        console.log('Loaded', transformedUsers.length, 'users from API');
                    }
                }

                // Process brands
                if (brandsResponse.status === 'fulfilled' && brandsResponse.value.success) {
                    const brandsData = Array.isArray(brandsResponse.value) ? brandsResponse.value : brandsResponse.value.data || [];
                    if (brandsData.length > 0) {
                        const transformedBrands = brandsData.map(transformBrandFromAPI);
                        setBrands(transformedBrands);
                        console.log('Loaded', transformedBrands.length, 'brands from API');
                    }
                }

                // Process music
                if (musicResponse.status === 'fulfilled' && musicResponse.value.success) {
                    const musicData = Array.isArray(musicResponse.value) ? musicResponse.value : musicResponse.value.data || [];
                    if (musicData.length > 0) {
                        const songsData = musicData.filter((item: any) => item.type === 'music');
                        const episodesData = musicData.filter((item: any) => item.type === 'podcast');
                        
                        if (songsData.length > 0) setSongs(songsData);
                        if (episodesData.length > 0) setEpisodes(episodesData);
                        
                        console.log('Loaded', songsData.length, 'songs and', episodesData.length, 'episodes from API');
                    }
                }

                // Process groups
                if (groupsResponse.status === 'fulfilled' && groupsResponse.value.success) {
                    const groupsData = Array.isArray(groupsResponse.value) ? groupsResponse.value : groupsResponse.value.data || [];
                    if (groupsData.length > 0) {
                        setGroups(groupsData);
                        console.log('Loaded', groupsData.length, 'groups from API');
                    }
                }

                // Process products
                if (productsResponse.status === 'fulfilled' && productsResponse.value.success) {
                    const productsData = Array.isArray(productsResponse.value) ? productsResponse.value : productsResponse.value.data || [];
                    if (productsData.length > 0) {
                        setProducts(productsData);
                        console.log('Loaded', productsData.length, 'products from API');
                    }
                }

            } catch (error) {
                console.error('Error fetching data:', error);
                setApiError('Failed to load fresh data. Using cached content.');
            } finally {
                setApiLoading(false);
            }
        };

        // Small delay to ensure initial render
        setTimeout(() => {
            fetchInitialData();
        }, 300);
        
    }, [isClient]);

    // Save data to localStorage
    useEffect(() => {
        if (isClient) {
            if (currentUser) {
                localStorage.setItem('universeCurrentUser', JSON.stringify(currentUser));
            }
            
            // Save other data for offline use
            localStorage.setItem('universePosts', JSON.stringify(posts));
            localStorage.setItem('universeUsers', JSON.stringify(users));
            localStorage.setItem('universeBrands', JSON.stringify(brands));
            localStorage.setItem('universeSongs', JSON.stringify(songs));
            localStorage.setItem('universeEpisodes', JSON.stringify(episodes));
            localStorage.setItem('universeGroups', JSON.stringify(groups));
            localStorage.setItem('marketplaceProducts', JSON.stringify(products));
        }
    }, [currentUser, posts, users, brands, songs, episodes, groups, products, isClient]);

    // ========== NOTIFICATION MANAGEMENT ==========
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
    }, [notifications]);

    // ========== AUTHENTICATION FUNCTIONS WITH API ==========
    const handleLogin = async (email: string, password: string) => {
        setLoginError('');
        
        try {
            const result = await apiService.login(email, password);
            
            if (result.success && result.user) {
                const user = transformUserFromAPI(result.user);
                setCurrentUser(user);
                setView('home');
                setActiveTab('home');
                setShowRegister(false);
                setShowForgotPassword(false);
                
                // Update users list
                setUsers(prev => {
                    const exists = prev.find(u => u.id === user.id);
                    if (exists) {
                        return prev.map(u => u.id === user.id ? user : u);
                    }
                    return [...prev, user];
                });
                
                if (isClient) window.history.pushState({}, '', '/');
            } else {
                setLoginError(result.error || 'Invalid email or password');
            }
        } catch (error: any) {
            setLoginError(error.message || 'Login failed. Please try again.');
        }
    };

    const handleRegister = async (newUser: Partial<User>) => {
        try {
            const result = await apiService.register(newUser);
            
            if (result.success && result.user) {
                const user = transformUserFromAPI(result.user);
                setCurrentUser(user);
                setUsers(prev => [...prev, user]);
                setShowRegister(false);
                setShowForgotPassword(false);
                setView('home');
                
                if (isClient) {
                    window.history.pushState({}, '', '/');
                }
            } else {
                setLoginError(result.error || 'Registration failed');
            }
        } catch (error: any) {
            setLoginError(error.message || 'Registration failed. Please try again.');
        }
    };

    const handleLogout = () => {
        setCurrentUser(null);
        localStorage.removeItem('authToken');
        localStorage.removeItem('universeCurrentUser');
        
        if (isClient) {
            window.history.pushState({}, '', '/');
        }
        
        setView('home');
        setCurrentAudioTrack(null);
        setIsAudioPlaying(false);
    };

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

        // Handle all menu views
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
    
    // ========== POST FUNCTIONS WITH API ==========
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
        if (!currentUser) {
            setView('login');
            alert('Please login to create posts');
            return;
        }
        
        const timestamp = Date.now();
        const formattedTime = formatRelativeTime(timestamp);
        
        // Create local post for immediate UI update
        const newPost: PostType = { 
            id: timestamp, 
            authorId: currentUser.id, 
            content: text, 
            images: files ? files.map(file => URL.createObjectURL(file)) : undefined,
            timestamp: timestamp,
            formattedTime: formattedTime,
            createdAt: timestamp, 
            reactions: [], 
            comments: [], 
            shares: 0, 
            views: 0, 
            type: type === 'multimage' ? 'image' : (type === 'video' ? 'video' : 'text'),
            visibility, 
            location, 
            feeling, 
            taggedUsers, 
            background, 
            linkPreview 
        };
        
        setPosts([newPost, ...posts]);
        
        // Save to API
        try {
            const postData = {
                content: text,
                type: type === 'multimage' ? 'image' : type,
                visibility: visibility || 'Public',
                location,
                feeling,
                taggedUsers,
                background,
                linkPreview
            };
            
            const result = await apiService.createPost(postData);
            if (result.success) {
                console.log('Post saved to API');
            }
        } catch (error) {
            console.error('Failed to save post to API:', error);
        }
    };

    const handleReact = async (itemId: number, type: ReactionType) => {
        if (!currentUser) {
            setView('login');
            alert('Please login to react to posts');
            return;
        }
        
        // Update local state immediately
        setPosts(prev => prev.map(post => {
            if (post.id === itemId) {
                const existing = post.reactions.find(r => r.userId === currentUser!.id);
                let newReactions = [...post.reactions];
                if (existing) {
                    if (existing.type === type) {
                        newReactions = newReactions.filter(r => r.userId !== currentUser!.id);
                    } else {
                        newReactions = newReactions.map(r => r.userId === currentUser!.id ? { ...r, type } : r);
                    }
                } else {
                    newReactions.push({ userId: currentUser!.id, type });
                }
                return { ...post, reactions: newReactions };
            }
            return post;
        }));
        
        // Save to API
        try {
            await apiService.reactToPost(itemId, type);
        } catch (error) {
            console.error('Failed to save reaction to API:', error);
        }
    };

    const handleComment = async (itemId: number, text: string, attachment?: any, parentId?: number) => {
        if (!currentUser) {
            setView('login');
            alert('Please login to comment');
            return;
        }
        
        const timestamp = Date.now();
        const formattedTime = formatRelativeTime(timestamp);
        const newComment: Comment = { 
            id: timestamp, 
            userId: currentUser.id, 
            text, 
            timestamp: timestamp,
            formattedTime: formattedTime,
            likes: 0, 
            attachment,
            authorName: currentUser.name,
            authorImage: currentUser.profileImage
        };
        
        // Update local state
        setPosts(prev => prev.map(p => {
            if (p.id === itemId) {
                return { ...p, comments: [...p.comments, newComment] };
            }
            return p;
        }));
        
        // Save to API
        try {
            await apiService.commentOnPost(itemId, {
                text,
                attachment,
                parentId
            });
        } catch (error) {
            console.error('Failed to save comment to API:', error);
        }
    };

    const handleDeletePost = async (postId: number) => {
        if (!currentUser) {
            setView('login');
            alert('Please login to delete posts');
            return;
        }
        
        const post = posts.find(p => p.id === postId);
        if (!post) {
            alert("Post not found.");
            return;
        }
        
        if (!isAdmin && post.authorId !== currentUser.id) {
            alert("You can only delete your own posts.");
            return;
        }
        
        if (window.confirm("Are you sure you want to delete this post?")) {
            // Remove from local state
            setPosts(prev => prev.filter(p => p.id !== postId));
            
            // Delete from API
            try {
                await apiService.deletePost(postId);
                alert("Post deleted successfully!");
            } catch (error) {
                console.error('Failed to delete post from API:', error);
                alert("Post deleted locally, but failed to delete from server.");
            }
        }
    };

    // ========== USER FUNCTIONS ==========
    const handleFollowUser = (userIdToToggle: number) => {
        if (!currentUser) {
            setView('login');
            alert('Please login to follow users');
            return;
        }
        
        // ... existing follow logic (update as needed with API calls)
        const currentUserId = currentUser.id;
        const isCurrentlyFollowing = currentUser.following.includes(userIdToToggle);

        if (!isCurrentlyFollowing && userIdToToggle !== currentUserId) {
            handleCreateNotification(
                userIdToToggle,
                currentUserId,
                'follow',
                'started following you.',
                {}
            );
        }

        const newUsers = users.map(user => {
            if (user.id === currentUserId) {
                let updatedFollowing, updatedFollowers;
    
                if (isCurrentlyFollowing) {
                    updatedFollowing = user.following.filter(id => id !== userIdToToggle);
                    updatedFollowers = user.followers.filter(id => id !== userIdToToggle);
                } else {
                    updatedFollowing = [...user.following, userIdToToggle];
                    updatedFollowers = [...user.followers, userIdToToggle];
                }
                
                const updatedUser = { 
                    ...user, 
                    following: updatedFollowing,
                    followers: updatedFollowers
                };
    
                setCurrentUser(updatedUser);
                return updatedUser;
            }
    
            if (user.id === userIdToToggle) {
                let updatedFollowers, updatedFollowing;
    
                if (isCurrentlyFollowing) {
                    updatedFollowers = user.followers.filter(id => id !== currentUserId);
                    updatedFollowing = user.following.filter(id => id !== currentUserId);
                } else {
                    updatedFollowers = [...user.followers, currentUserId];
                    updatedFollowing = [...user.following, currentUserId];
                }
                return { 
                    ...user,
                    followers: updatedFollowers,
                    following: updatedFollowing
                };
            }
    
            return user;
        });
    
        setUsers(newUsers);
    };

    // ========== PRODUCT FUNCTIONS WITH API ==========
    const handleCreateProduct = async (productData: Partial<Product>) => {
        if (!currentUser) {
            setView('login');
            alert('Please login to create products');
            return;
        }

        const newProduct: Product = {
            id: Date.now(),
            title: productData.title || 'Untitled',
            description: productData.description || '',
            category: productData.category || 'other',
            mainPrice: productData.mainPrice || 0,
            discountPrice: productData.discountPrice || null,
            quantity: productData.quantity || 1,
            images: productData.images || [],
            address: productData.address || '',
            country: productData.country || 'US',
            phoneNumber: productData.phoneNumber || '',
            sellerId: currentUser.id,
            sellerName: currentUser.name,
            sellerAvatar: currentUser.profileImage || 'https://via.placeholder.com/150',
            status: 'active',
            views: 0,
            ratings: [],
            comments: [],
            date: Date.now(),
            shareId: 'prod_' + Math.random().toString(36).substring(2, 15),
        };

        // Update local state
        setProducts(prev => [...prev, newProduct]);
        
        // Save to API
        try {
            const result = await apiService.createProduct({
                title: newProduct.title,
                description: newProduct.description,
                category: newProduct.category,
                mainPrice: newProduct.mainPrice,
                discountPrice: newProduct.discountPrice,
                quantity: newProduct.quantity,
                images: newProduct.images,
                address: newProduct.address,
                country: newProduct.country,
                phoneNumber: newProduct.phoneNumber
            });
            
            if (result.success) {
                alert("Product listed successfully!");
            }
        } catch (error) {
            console.error('Failed to save product to API:', error);
            alert("Product saved locally, but failed to save to server.");
        }
        
        return newProduct;
    };

    // ========== BRAND FUNCTIONS WITH API ==========
    const handleCreateBrand = async (brandData: Partial<Brand>) => {
        if (!currentUser) {
            setView('login');
            alert('Please login to create brands');
            return;
        }
        
        const newBrand: Brand = {
            id: Date.now(),
            name: brandData.name || 'New Brand',
            category: brandData.category || 'Business',
            description: brandData.description || '',
            location: brandData.location || '',
            website: brandData.website || '',
            contactEmail: brandData.contactEmail || '',
            contactPhone: brandData.contactPhone || '',
            adminId: currentUser.id,
            followers: [currentUser.id],
            isVerified: false,
            posts: [],
            createdAt: Date.now(),
            profileImage: brandData.profileImage || `https://ui-avatars.com/api/?name=${brandData.name || 'Brand'}&background=random&size=150`,
            coverImage: brandData.coverImage || 'https://images.unsplash.com/photo-1557683316-973673baf926?ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80'
        };
        
        // Update local state
        setBrands(prev => [newBrand, ...prev]);
        
        // Save to API
        try {
            const result = await apiService.createBrand({
                name: newBrand.name,
                category: newBrand.category,
                description: newBrand.description,
                location: newBrand.location,
                website: newBrand.website,
                contactEmail: newBrand.contactEmail,
                contactPhone: newBrand.contactPhone
            });
            
            if (result.success) {
                alert("Brand page created successfully!");
            }
        } catch (error) {
            console.error('Failed to save brand to API:', error);
            alert("Brand saved locally, but failed to save to server.");
        }
    };

    const handleFollowBrand = async (brandId: number) => {
        if (!currentUser) {
            setView('login');
            alert('Please login to follow brands');
            return;
        }
        
        // Update local state
        setBrands(prev => prev.map(b => {
            if (b.id === brandId) {
                const isFollowing = b.followers.includes(currentUser!.id);
                const updatedFollowers = isFollowing 
                    ? b.followers.filter(id => id !== currentUser!.id) 
                    : [...b.followers, currentUser!.id];
                
                return { 
                    ...b, 
                    followers: updatedFollowers
                };
            }
            return b;
        }));
        
        // Save to API
        try {
            await apiService.followBrand(brandId);
        } catch (error) {
            console.error('Failed to save follow status to API:', error);
        }
    };

    const handlePostAsBrand = async (
        brandId: number, 
        content: any
    ) => {
        if (!currentUser) {
            setView('login');
            alert('Please login to post as brand');
            return;
        }
        
        const { text, files, type, visibility, location, feeling, taggedUsers, background, linkPreview } = content;
        
        const brand = brands.find(b => b.id === brandId);
        if (!brand) {
            alert("Brand not found.");
            return;
        }
        
        if (brand.adminId !== currentUser.id && !isAdmin) {
            alert("You don't have permission to post as this brand.");
            return;
        }
        
        const timestamp = Date.now();
        const formattedTime = formatRelativeTime(timestamp);
        const newPost: PostType = { 
            id: timestamp,
            authorId: brandId,
            content: text,
            images: files ? files.map(file => URL.createObjectURL(file)) : undefined,
            timestamp: timestamp,
            formattedTime: formattedTime,
            createdAt: timestamp,
            reactions: [], 
            comments: [], 
            shares: 0,
            views: 0,
            type: type === 'multimage' ? 'image' : (type === 'video' ? 'video' : 'text'),
            visibility: visibility as any,
            location, 
            feeling, 
            taggedUsers, 
            background, 
            linkPreview,
            brandId: brandId
        };
        
        // Update local state
        setPosts(prev => [newPost, ...posts]);
        
        // Save to API
        try {
            const result = await apiService.createPost({
                content: text,
                type: type === 'multimage' ? 'image' : type,
                visibility: visibility || 'Public',
                location,
                feeling,
                taggedUsers,
                background,
                linkPreview,
                brandId
            });
            
            if (result.success) {
                alert("Brand post published successfully!");
            }
        } catch (error) {
            console.error('Failed to save brand post to API:', error);
            alert("Post saved locally, but failed to save to server.");
        }
        
        return newPost;
    };

    // ========== GROUP FUNCTIONS WITH API ==========
    const handleCreateGroup = async (groupData: Partial<Group>) => {
        if (!currentUser) {
            setView('login');
            alert('Please login to create groups');
            return;
        }
        
        const timestamp = Date.now();
        const newGroup: Group = { 
            ...groupData, 
            id: `g${timestamp}`, 
            adminId: currentUser.id, 
            members: [currentUser.id], 
            posts: [], 
            createdDate: timestamp,
            image: groupData.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(groupData.name || 'Group')}&background=random&size=150`,
            coverImage: groupData.coverImage || 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80',
            events: [],
            memberPostingAllowed: true
        } as Group;
        
        // Update local state
        setGroups(prev => [newGroup, ...prev]);
        
        // Save to API
        try {
            const result = await apiService.createGroup({
                name: newGroup.name,
                description: newGroup.description,
                category: newGroup.category,
                privacy: newGroup.privacy
            });
            
            if (result.success) {
                alert("Group created successfully!");
            }
        } catch (error) {
            console.error('Failed to save group to API:', error);
            alert("Group saved locally, but failed to save to server.");
        }
    };

    const handleJoinGroup = async (groupId: string) => { 
        if (!currentUser) {
            setView('login');
            alert('Please login to join groups');
            return;
        }
        
        // Update local state
        setGroups(prev => prev.map(g => 
            (g.id === groupId && !g.members.includes(currentUser.id)) 
                ? { 
                    ...g, 
                    members: [...g.members, currentUser.id] 
                } 
                : g
        )); 
        
        // Save to API
        try {
            await apiService.joinGroup(groupId);
        } catch (error) {
            console.error('Failed to save join status to API:', error);
        }
    };

    // ========== MUSIC FUNCTIONS WITH API ==========
    const handleAddSong = async (song: Song) => {
        if (!currentUser) {
            setView('login');
            alert('Please login to add songs');
            return;
        }
        
        const newSong = {
            ...song,
            plays: song.plays || 0,
            likes: song.likes || 0,
            shares: song.shares || 0,
            comments: song.comments || 0,
            uploadDate: song.uploadDate || new Date().toISOString(),
            stats: song.stats || {
                plays: song.plays || 0,
                likes: song.likes || 0,
                shares: song.shares || 0,
                comments: song.comments || 0,
                downloads: 0,
                reelsUse: 0
            }
        };
        
        // Update local state
        setSongs(prev => {
            const exists = prev.find(s => s.id === song.id);
            if (exists) {
                return prev.map(s => s.id === song.id ? newSong : s);
            }
            return [newSong, ...prev];
        });
        
        // Save to API
        try {
            const result = await apiService.uploadSong({
                title: song.title,
                artist: song.artist,
                duration: song.duration,
                audioUrl: song.audioUrl,
                cover: song.cover,
                type: 'music'
            });
            
            if (result.success) {
                console.log('Song uploaded to API');
            }
        } catch (error) {
            console.error('Failed to upload song to API:', error);
        }
    };

    // ========== RENDER FUNCTIONS ==========
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
                onProfileClick={(id) => { 
                    if (currentUser) {
                        setSelectedUserId(id); 
                        setView('profile'); 
                    } else {
                        setView('login');
                    }
                }}
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
                    } else if (currentUser) {
                        setSelectedUserId(id); 
                        setView('profile');
                    } else {
                        setView('login');
                    }
                }} 
                onReact={handleReact} 
                onShare={(id) => {
                    if (currentUser) {
                        setActiveSharePostId(id);
                    } else {
                        setView('login');
                    }
                }} 
                onViewImage={(url) => setFullScreenImage(url)} 
                onOpenComments={(postId) => {
                    if (currentUser) {
                        setActiveCommentsPostId(postId);
                    } else {
                        setView('login');
                    }
                }} 
                onVideoClick={(p) => { setActiveReelId(p.id - 200000); setView('reels'); }} 
                onViewProduct={(p) => setActiveProduct(p)} 
                onGroupClick={(groupId) => { setInitialGroupIdToView(groupId); setView('groups'); setActiveTab('groups'); }} 
                onPlayAudioTrack={handlePlayTrack} 
                onFollow={isBrandAuthor ? handleFollowBrand : handleFollowUser} 
                isFollowing={isBrandAuthor ? isFollowingBrand : isFollowing} 
                onHashtagClick={(tag) => {
                    if (!currentUser) {
                        setView('login');
                        alert('Please login to view hashtags');
                        return;
                    }
                    setActiveTag(tag.replace('#', ''));
                    setView('tag_feed');
                }} 
                onDeletePost={handleDeletePost} 
                isAdmin={isAdmin}
                getImageGridClass={getImageGridClass}
                getImageItemClass={getImageItemClass}
            />
        );
    };

    // ========== MAIN RENDER LOGIC ==========
    const effectiveView = view;
    
    // Show API loading indicator
    if (apiLoading && posts.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#18191A] flex-col">
                <div className="w-20 h-20 border-4 border-[#1877F2] border-t-transparent rounded-full animate-spin mb-4"></div>
                <div className="text-[#1877F2] font-bold text-xl animate-pulse">Loading content from API...</div>
                {apiError && (
                    <div className="text-red-500 mt-4">{apiError}</div>
                )}
            </div>
        );
    }
    
    return (
        <div className="bg-[#18191A] min-h-screen flex flex-col font-sans">
            {effectiveView === 'login' && !currentUser ? (
                 showRegister 
                    ? <Register onRegister={handleRegister} onBackToLogin={() => { setShowRegister(false); setShowForgotPassword(false); }} /> 
                    : showForgotPassword
                    ? <ForgotPassword onBackToLogin={() => { setShowForgotPassword(false); setShowRegister(false); }} />
                    : <Login onLogin={handleLogin} onNavigateToRegister={() => { setShowRegister(true); setShowForgotPassword(false); }} onNavigateToForgotPassword={() => { setShowForgotPassword(true); setShowRegister(false); }} onClose={() => { setView('home'); }} error={loginError} />
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
                    
                    {apiError && !apiLoading && (
                        <div className="bg-yellow-500 text-white text-center py-2 px-4">
                            {apiError} <button onClick={() => window.location.reload()} className="underline ml-2">Refresh</button>
                        </div>
                    )}
                    
                    <Header 
                        onHomeClick={() => handleNavigate('home')} 
                        onProfileClick={(id) => { 
                            if (currentUser) {
                                setSelectedUserId(id); 
                                setView('profile');
                            } else {
                                setView('login');
                            }
                        }} 
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
                                currentUser={currentUser || users[0] || INITIAL_USERS[0]} 
                                onProfileClick={(id) => { 
                                    if (currentUser) {
                                        setSelectedUserId(id); 
                                        setView('profile');
                                    } else {
                                        setView('login');
                                    }
                                }} 
                                onReelsClick={() => handleNavigate('reels')} 
                                onMarketplaceClick={() => handleNavigate('marketplace')} 
                                onGroupsClick={() => handleNavigate('groups')} 
                            />
                        </div>
                        
                        <div className="w-full lg:w-[740px] xl:w-[700px] min-h-screen">
                            {/* Main content rendering - same as before */}
                            {effectiveView === 'home' && (
                                <div className="w-full pt-4 md:px-8 pb-10">
                                    <StoryReel 
                                        stories={storiesWithUsers} 
                                        onProfileClick={(id) => { 
                                            if (currentUser) {
                                                setSelectedUserId(id); 
                                                setView('profile');
                                            } else {
                                                setView('login');
                                            }
                                        }} 
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
                                    
                                    {rankedPosts.length === 0 && (
                                        <div className="text-center py-10 text-gray-400">
                                            No posts to show yet. Be the first to post something!
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {/* Other views remain the same as previous version */}
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
                                                    timestamp: p.date,
                                                    formattedTime: formatRelativeTime(p.date),
                                                    createdAt: p.date,
                                                    reactions: [],
                                                    comments: [],
                                                    shares: 0,
                                                    views: p.views,
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
                                    onVerifyUser={handleVerifyUser} 
                                    onRestrictUser={handleRestrictUser} 
                                    onDeleteUser={handleDeleteUser} 
                                    onMakeModerator={handleMakeModerator} 
                                    onHashtagClick={(tag) => {
                                        if (!currentUser) {
                                            setView('login');
                                            alert('Please login to view hashtags');
                                            return;
                                        }
                                        setActiveTag(tag.replace('#', ''));
                                        setView('tag_feed');
                                    }} 
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
                            
                            {/* Other views (marketplace, reels, groups, brands, music, etc.) */}
                            {/* ... continue with the rest of your view rendering code from previous version */}
                            
                        </div>
                        
                        <div className="sticky top-14 h-[calc(100vh-56px)] z-20 hidden xl:block pl-4">
                            <RightSidebar 
                                contacts={users.filter(u => u.id !== currentUser?.id).slice(0, 10)} 
                                onProfileClick={(id) => { 
                                    if (currentUser) {
                                        setSelectedUserId(id); 
                                        setView('profile');
                                    } else {
                                        setView('login');
                                    }
                                }} 
                            />
                        </div>
                    </div>
                    
                    {/* Modals - same as before */}
                    {showCreatePostModal && currentUser && (
                        <CreatePostModal 
                            currentUser={currentUser} 
                            users={users} 
                            onClose={() => setShowCreatePostModal(false)} 
                            onCreatePost={handleCreatePost} 
                        />
                    )}
                    
                    {/* Other modals - same as before */}
                </>
            )}
        </div>
    );
}
