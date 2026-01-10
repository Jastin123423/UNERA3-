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

// ========== API SERVICE FUNCTIONS ==========
class APIService {
    private static instance: APIService;
    private baseURL: string;
    private guestToken: string | null = null;
    private authToken: string | null = null;

    private constructor() {
        this.baseURL = API_BASE_URL;
        if (typeof window !== 'undefined') {
            this.authToken = localStorage.getItem('authToken');
            this.guestToken = localStorage.getItem('guestToken') || `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            if (!localStorage.getItem('guestToken')) {
                localStorage.setItem('guestToken', this.guestToken);
            }
        }
    }

    public static getInstance(): APIService {
        if (!APIService.instance) {
            APIService.instance = new APIService();
        }
        return APIService.instance;
    }

    public setAuthToken(token: string): void {
        this.authToken = token;
        localStorage.setItem('authToken', token);
    }

    public clearAuthToken(): void {
        this.authToken = null;
        localStorage.removeItem('authToken');
    }

    private getHeaders(isGuest: boolean = false): HeadersInit {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (isGuest) {
            headers['X-Guest-Token'] = this.guestToken || '';
        } else if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }

        return headers;
    }

    private async handleResponse(response: Response) {
        if (!response.ok) {
            if (response.status === 401) {
                this.clearAuthToken();
                throw new Error('Session expired. Please login again.');
            }
            const error = await response.json().catch(() => ({ message: 'API Error' }));
            throw new Error(error.message || `API Error: ${response.status}`);
        }

        return response.json();
    }

    // Public API methods
    public async fetchPublicPosts(): Promise<any> {
        try {
            const response = await fetch(`${this.baseURL}/api/posts/public`, {
                headers: this.getHeaders(true)
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error('Failed to fetch public posts:', error);
            throw error;
        }
    }

    public async fetchUsers(): Promise<any> {
        try {
            const response = await fetch(`${this.baseURL}/api/users`, {
                headers: this.getHeaders(true)
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error('Failed to fetch users:', error);
            throw error;
        }
    }

    public async login(email: string, password: string): Promise<any> {
        try {
            const response = await fetch(`${this.baseURL}/api/auth/login`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ email, password })
            });
            const data = await this.handleResponse(response);
            if (data.token) {
                this.setAuthToken(data.token);
            }
            return data;
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    }

    public async register(userData: Partial<User>): Promise<any> {
        try {
            const response = await fetch(`${this.baseURL}/api/auth/register`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(userData)
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error('Registration failed:', error);
            throw error;
        }
    }

    public async createPost(postData: any): Promise<any> {
        try {
            const response = await fetch(`${this.baseURL}/api/posts`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(postData)
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error('Failed to create post:', error);
            throw error;
        }
    }

    public async fetchBrands(): Promise<any> {
        try {
            const response = await fetch(`${this.baseURL}/api/brands`, {
                headers: this.getHeaders(true)
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error('Failed to fetch brands:', error);
            throw error;
        }
    }

    public async fetchMusic(): Promise<any> {
        try {
            const response = await fetch(`${this.baseURL}/api/music`, {
                headers: this.getHeaders(true)
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error('Failed to fetch music:', error);
            throw error;
        }
    }

    public async fetchGroups(): Promise<any> {
        try {
            const response = await fetch(`${this.baseURL}/api/groups`, {
                headers: this.getHeaders(true)
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error('Failed to fetch groups:', error);
            throw error;
        }
    }

    public async verifyAuth(): Promise<any> {
        if (!this.authToken) {
            throw new Error('No auth token');
        }

        try {
            const response = await fetch(`${this.baseURL}/api/auth/verify`, {
                headers: this.getHeaders()
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error('Auth verification failed:', error);
            this.clearAuthToken();
            throw error;
        }
    }
}

// Initialize API service
const apiService = APIService.getInstance();

// ========== DATA TRANSFORMATION FUNCTIONS ==========
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

    // CRITICAL FIX: Start as guest by default
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [posts, setPosts] = useState<PostType[]>([]);
    const [stories, setStories] = useState<Story[]>(INITIAL_STORIES);
    const [reels, setReels] = useState<Reel[]>(INITIAL_REELS);
    const [events, setEvents] = useState<Event[]>(INITIAL_EVENTS);
    const [products, setProducts] = useState<Product[]>([]);
    const [groups, setGroups] = useState<Group[]>(INITIAL_GROUPS);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [songs, setSongs] = useState<Song[]>([]);
    const [episodes, setEpisodes] = useState<Episode[]>([]);
    
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
    const [notifications, setNotifications] = useState<Notification[]>([]);
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

    // ========== API DATA FETCHING ==========
    useEffect(() => {
        const fetchInitialData = async () => {
            setIsLoading(true);
            setApiError(null);
            
            try {
                // Check if user is already logged in
                const authToken = localStorage.getItem('authToken');
                if (authToken) {
                    try {
                        const userData = await apiService.verifyAuth();
                        if (userData.user) {
                            setCurrentUser(transformUserFromAPI(userData.user));
                        }
                    } catch (error) {
                        console.log('Session expired or invalid');
                        localStorage.removeItem('authToken');
                        localStorage.removeItem('universeCurrentUser');
                    }
                }

                // Fetch public data for guests
                const [postsResponse, usersResponse, brandsResponse, musicResponse, groupsResponse] = await Promise.allSettled([
                    apiService.fetchPublicPosts(),
                    apiService.fetchUsers(),
                    apiService.fetchBrands(),
                    apiService.fetchMusic(),
                    apiService.fetchGroups()
                ]);

                // Handle posts
                if (postsResponse.status === 'fulfilled') {
                    const postsData = Array.isArray(postsResponse.value) ? postsResponse.value : postsResponse.value.data || [];
                    const transformedPosts = postsData.map(transformPostFromAPI);
                    setPosts(transformedPosts);
                } else {
                    console.error('Failed to fetch posts:', postsResponse.reason);
                    setPosts(INITIAL_POSTS.map(post => ({
                        ...post,
                        formattedTime: formatRelativeTime(post.timestamp || Date.now())
                    })));
                }

                // Handle users
                if (usersResponse.status === 'fulfilled') {
                    const usersData = Array.isArray(usersResponse.value) ? usersResponse.value : usersResponse.value.data || [];
                    const transformedUsers = usersData.map(transformUserFromAPI);
                    setUsers(transformedUsers);
                } else {
                    console.error('Failed to fetch users:', usersResponse.reason);
                    setUsers(INITIAL_USERS);
                }

                // Handle brands
                if (brandsResponse.status === 'fulfilled') {
                    const brandsData = Array.isArray(brandsResponse.value) ? brandsResponse.value : brandsResponse.value.data || [];
                    setBrands(brandsData);
                } else {
                    console.error('Failed to fetch brands:', brandsResponse.reason);
                    setBrands(INITIAL_BRANDS);
                }

                // Handle music
                if (musicResponse.status === 'fulfilled') {
                    const musicData = Array.isArray(musicResponse.value) ? musicResponse.value : musicResponse.value.data || [];
                    setSongs(musicData.filter((item: any) => item.type === 'music'));
                    setEpisodes(musicData.filter((item: any) => item.type === 'podcast'));
                } else {
                    console.error('Failed to fetch music:', musicResponse.reason);
                    setSongs(MOCK_SONGS);
                    setEpisodes(MOCK_EPISODES);
                }

                // Handle groups
                if (groupsResponse.status === 'fulfilled') {
                    const groupsData = Array.isArray(groupsResponse.value) ? groupsResponse.value : groupsResponse.value.data || [];
                    setGroups(groupsData);
                } else {
                    console.error('Failed to fetch groups:', groupsResponse.reason);
                    setGroups(INITIAL_GROUPS);
                }

            } catch (error) {
                console.error('Failed to fetch initial data:', error);
                setApiError('Failed to load content. Please refresh the page.');
                
                // Set fallback data
                setUsers(INITIAL_USERS);
                setPosts(INITIAL_POSTS.map(post => ({
                    ...post,
                    formattedTime: formatRelativeTime(post.timestamp || Date.now())
                })));
                setBrands(INITIAL_BRANDS);
                setSongs(MOCK_SONGS);
                setEpisodes(MOCK_EPISODES);
                setGroups(INITIAL_GROUPS);
            } finally {
                setIsLoading(false);
            }
        };

        fetchInitialData();
    }, []);

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

    // ========== AUTHENTICATION FUNCTIONS ==========
    const handleLogin = async (email: string, pass: string) => {
        setLoginError('');
        
        try {
            const response = await apiService.login(email, pass);
            
            if (response.user && response.token) {
                const user = transformUserFromAPI(response.user);
                setCurrentUser(user);
                setView('home');
                setActiveTab('home');
                setShowRegister(false);
                setShowForgotPassword(false);
                
                // Also update local users list
                setUsers(prev => {
                    const exists = prev.find(u => u.id === user.id);
                    if (exists) {
                        return prev.map(u => u.id === user.id ? user : u);
                    }
                    return [...prev, user];
                });
                
                if (isClient) window.history.pushState({}, '', '/');
            } else {
                setLoginError('Invalid email or password');
            }
        } catch (error: any) {
            setLoginError(error.message || 'Login failed. Please try again.');
        }
    };

    const handleRegister = async (newUser: Partial<User>) => {
        try {
            const response = await apiService.register(newUser);
            
            if (response.user && response.token) {
                const user = transformUserFromAPI(response.user);
                setCurrentUser(user);
                setUsers(prev => [...prev, user]);
                setShowRegister(false);
                setShowForgotPassword(false);
                setView('home');
                if (isClient) window.history.pushState({}, '', '/');
            }
        } catch (error: any) {
            setLoginError(error.message || 'Registration failed. Please try again.');
        }
    };

    const handleLogout = () => {
        setCurrentUser(null);
        apiService.clearAuthToken();
        
        if (isClient) {
            localStorage.removeItem('universeCurrentUser');
            window.history.pushState({}, '', '/');
        }
        
        setView('home'); // Go to home as guest
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
    
    // ========== POST FUNCTIONS ==========
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
        
        const timestamp = Date.now();
        const formattedTime = formatRelativeTime(timestamp);
        
        // Create local post immediately for better UX
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
        
        // Then try to save to API
        try {
            const postData = {
                content: text,
                visibility: visibility || 'Public',
                location,
                feeling,
                taggedUsers,
                background,
                linkPreview,
                type: type === 'multimage' ? 'image' : type
            };
            
            await apiService.createPost(postData);
            console.log('Post saved to API successfully');
        } catch (error) {
            console.error('Failed to save post to API:', error);
        }
    };

    // ========== GUEST-FRIENDLY HANDLERS ==========
    const handleGuestAction = (action: string) => {
        setView('login');
        alert(`Please login to ${action}`);
    };

    const handleTagClick = (tag: string) => {
        if (!currentUser) {
            handleGuestAction('view hashtags');
            return;
        }
        setActiveTag(tag.replace('#', ''));
        setView('tag_feed');
    };

    const handleReact = (itemId: number, type: ReactionType) => {
        if (!currentUser) {
            handleGuestAction('react to posts');
            return;
        }
        
        setPosts(prev => prev.map(post => {
            if (post.id === itemId) {
                const existing = post.reactions.find(r => r.userId === currentUser!.id);
                let newReactions = [...post.reactions];
                if (existing) {
                    if (existing.type === type) newReactions = newReactions.filter(r => r.userId !== currentUser!.id);
                    else newReactions = newReactions.map(r => r.userId === currentUser!.id ? { ...r, type } : r);
                } else {
                    newReactions.push({ userId: currentUser!.id, type });
                }
                return { ...post, reactions: newReactions };
            }
            return post;
        }));
    };

    const handleComment = (itemId: number, text: string, attachment?: any, parentId?: number) => {
        if (!currentUser) {
            handleGuestAction('add comments');
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
        
        setPosts(prev => prev.map(p => {
            if (p.id === itemId) {
                return { ...p, comments: [...p.comments, newComment] };
            }
            return p;
        }));
    };

    // ========== FUNCTION TO RENDER POSTS ==========
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
                        handleGuestAction('view profiles');
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
                        handleGuestAction('view profiles');
                    }
                }} 
                onReact={handleReact} 
                onShare={(id) => {
                    if (currentUser) {
                        setActiveSharePostId(id);
                    } else {
                        handleGuestAction('share posts');
                    }
                }} 
                onViewImage={(url) => setFullScreenImage(url)} 
                onOpenComments={(postId) => {
                    if (currentUser) {
                        setActiveCommentsPostId(postId);
                    } else {
                        handleGuestAction('view comments');
                    }
                }} 
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

    // ========== GUEST-SAFE RENDER LOGIC ==========
    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex items-center justify-center min-h-screen bg-[#18191A] flex-col">
                    <div className="w-20 h-20 border-4 border-[#1877F2] border-t-transparent rounded-full animate-spin mb-4"></div>
                    <div className="text-[#1877F2] font-bold text-xl animate-pulse">Loading UNERA...</div>
                </div>
            );
        }

        if (apiError) {
            return (
                <div className="flex items-center justify-center min-h-screen bg-[#18191A] flex-col">
                    <div className="text-red-500 mb-4">{apiError}</div>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="bg-[#1877F2] text-white px-4 py-2 rounded-lg hover:bg-[#166FE5] transition"
                    >
                        Refresh Page
                    </button>
                </div>
            );
        }

        if (!currentUser && view === 'login') {
            return showRegister 
                ? <Register onRegister={handleRegister} onBackToLogin={() => { setShowRegister(false); setShowForgotPassword(false); }} /> 
                : showForgotPassword
                ? <ForgotPassword onBackToLogin={() => { setShowForgotPassword(false); setShowRegister(false); }} />
                : <Login onLogin={handleLogin} onNavigateToRegister={() => { setShowRegister(true); setShowForgotPassword(false); }} onNavigateToForgotPassword={() => { setShowForgotPassword(true); setShowRegister(false); }} onClose={() => { setView('home'); }} error={loginError} />;
        }

        // Main app interface for both guests and logged-in users
        return (
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
                    onProfileClick={(id) => { 
                        if (currentUser) {
                            setSelectedUserId(id); 
                            setView('profile');
                        } else {
                            handleGuestAction('view profiles');
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
                                    handleGuestAction('view profiles');
                                }
                            }} 
                            onReelsClick={() => handleNavigate('reels')} 
                            onMarketplaceClick={() => handleNavigate('marketplace')} 
                            onGroupsClick={() => handleNavigate('groups')} 
                        />
                    </div>
                    
                    <div className="w-full lg:w-[740px] xl:w-[700px] min-h-screen">
                        {renderMainContent()}
                    </div>
                    
                    <div className="sticky top-14 h-[calc(100vh-56px)] z-20 hidden xl:block pl-4">
                        <RightSidebar 
                            contacts={users.filter(u => u.id !== currentUser?.id).slice(0, 10)} 
                            onProfileClick={(id) => { 
                                if (currentUser) {
                                    setSelectedUserId(id); 
                                    setView('profile');
                                } else {
                                    handleGuestAction('view profiles');
                                }
                            }} 
                        />
                    </div>
                </div>
                
                {renderModals()}
            </>
        );
    };

    const renderMainContent = () => {
        switch(view) {
            case 'home':
                return (
                    <div className="w-full pt-4 md:px-8 pb-10">
                        <StoryReel 
                            stories={storiesWithUsers} 
                            onProfileClick={(id) => { 
                                if (currentUser) {
                                    setSelectedUserId(id); 
                                    setView('profile');
                                } else {
                                    handleGuestAction('view profiles');
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
                        
                        {rankedPosts.length > 0 ? (
                            rankedPosts.map(post => {
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
                            })
                        ) : (
                            <div className="text-center py-10 text-gray-400">
                                No posts to show. Be the first to post!
                            </div>
                        )}
                    </div>
                );
                
            case 'marketplace':
                return (
                    <MarketplacePage 
                        products={products} 
                        currentUser={currentUser} 
                        onNavigateHome={() => handleNavigate('home')}
                        onCreateProduct={handleCreateProduct}
                        onViewProduct={(product) => setActiveProduct(product)}
                    />
                );
                
            case 'reels':
                return (
                    <ReelsFeed 
                        reels={reels} 
                        users={users} 
                        currentUser={currentUser} 
                        activeReelId={activeReelId} 
                        onReelClick={setActiveReelId} 
                        onProfileClick={(id) => { 
                            if (currentUser) {
                                setSelectedUserId(id); 
                                setView('profile');
                            } else {
                                handleGuestAction('view profiles');
                            }
                        }} 
                        onNavigate={handleNavigate} 
                        onReact={handleReelReact}
                        onShare={(reelId, type) => {
                            if (!currentUser) {
                                handleGuestAction('share reels');
                                return;
                            }
                            // ... existing share logic
                        }}
                        onComment={(reelId, text) => {
                            if (!currentUser) {
                                handleGuestAction('comment on reels');
                                return;
                            }
                            // ... existing comment logic
                        }}
                        onCreateReelClick={() => {
                            if (currentUser) {
                                setShowCreateReelModal(true);
                            } else {
                                handleGuestAction('create reels');
                            }
                        }}
                        onFollow={handleFollowUser}
                        getCommentAuthor={(id) => users.find(u => u.id === id)}
                    />
                );
                
            case 'groups':
                return (
                    <GroupsPage 
                        key="groups-page"
                        groups={groups}
                        currentUser={currentUser}
                        users={users}
                        initialGroupId={initialGroupIdToView}
                        onCreateGroup={handleCreateGroup}
                        onJoinGroup={handleJoinGroup}
                        onLeaveGroup={handleLeaveGroup}
                        onDeleteGroup={handleDeleteGroup}
                        onUpdateGroupImage={handleUpdateGroupImage}
                        onPostToGroup={handlePostToGroup}
                        onCreateGroupEvent={handleCreateGroupEvent}
                        onInviteToGroup={handleInviteToGroup}
                        onProfileClick={(id) => { 
                            if (currentUser) {
                                setSelectedUserId(id); 
                                setView('profile'); 
                                setActiveTab('profile');
                            } else {
                                handleGuestAction('view profiles');
                            }
                        }}
                        onLikePost={handleReactGroupPost}
                        onOpenComments={handleOpenGroupComments}
                        onSharePost={handleShareGroupPost}
                        onDeleteGroupPost={handleDeleteGroupPost}
                        onRemoveMember={handleRemoveMember}
                        onUpdateGroupSettings={handleUpdateGroupSettings}
                        onPlayAudioTrack={handlePlayTrack}
                        getImageGridClass={getImageGridClass}
                        getImageItemClass={getImageItemClass}
                    />
                );
                
            case 'brands':
                return (
                    <BrandsPage 
                        currentUser={currentUser}
                        brands={brands}
                        posts={posts}
                        users={users}
                        onCreateBrand={handleCreateBrand}
                        onFollowBrand={handleFollowBrand}
                        onProfileClick={(id) => { 
                            if (currentUser) {
                                setSelectedUserId(id); 
                                setView('profile');
                            } else {
                                handleGuestAction('view profiles');
                            }
                        }}
                        onPostAsBrand={handlePostAsBrand}
                        onReact={handleReact}
                        onShare={(id) => {
                            if (currentUser) {
                                setActiveSharePostId(id);
                            } else {
                                handleGuestAction('share posts');
                            }
                        }}
                        onOpenComments={(postId) => {
                            if (currentUser) {
                                setActiveCommentsPostId(postId);
                            } else {
                                handleGuestAction('view comments');
                            }
                        }}
                        onUpdateBrand={handleUpdateBrand}
                        onDeleteBrand={handleDeleteBrand}
                        onMessage={(brandId) => {
                            if (currentUser) {
                                const brand = brands.find(b => b.id === brandId);
                                if (brand) {
                                    alert(`Messaging ${brand.name} - Feature coming soon!`);
                                }
                            } else {
                                handleGuestAction('message brands');
                            }
                        }}
                        onCreateEvent={(brandId, eventData) => {
                            if (currentUser) {
                                const eventWithBrand = {
                                    ...eventData,
                                    brandId: brandId,
                                    brandName: brands.find(b => b.id === brandId)?.name
                                };
                                handleCreateEvent(eventWithBrand);
                            } else {
                                handleGuestAction('create events');
                            }
                        }}
                        onUpdateBrandImage={handleUpdateBrandImage}
                        onDeletePost={handleDeletePost}
                        onVerifyBrand={handleVerifyBrand}
                        initialBrandId={activeBrandId}
                        onPlayAudioTrack={handlePlayTrack}
                        getImageGridClass={getImageGridClass}
                        getImageItemClass={getImageItemClass}
                    />
                );
                
            case 'music':
                return (
                    <MusicSystem 
                        songs={songs} 
                        episodes={episodes} 
                        currentUser={currentUser} 
                        onPlayTrack={handlePlayTrack} 
                        onProfileClick={(id) => { 
                            if (currentUser) {
                                setSelectedUserId(id); 
                                setView('profile');
                            } else {
                                handleGuestAction('view profiles');
                            }
                        }} 
                        onDeleteSong={handleDeleteSong} 
                        onDeleteEpisode={handleDeleteEpisode} 
                        likedTracks={likedTracks} 
                        onToggleLike={handleLikeTrack} 
                        onUploadToFeed={handleUploadToFeed} 
                        onAddSong={handleAddSong} 
                        onAddEpisode={handleAddEpisode} 
                        playHistory={playHistory}
                    />
                );
                
            // Add other views here with similar guest checks
            default:
                return (
                    <div className="w-full pt-4 md:px-8 pb-10">
                        <div className="text-center py-10 text-gray-400">
                            Content not available for this view.
                        </div>
                    </div>
                );
        }
    };

    const renderModals = () => {
        return (
            <>
                {showCreatePostModal && currentUser && (
                    <CreatePostModal 
                        currentUser={currentUser} 
                        users={users} 
                        onClose={() => setShowCreatePostModal(false)} 
                        onCreatePost={handleCreatePost} 
                    />
                )}
                
                {activeCommentsPostId && currentUser && (
                    <CommentsSheet 
                        post={posts.find(p => p.id === activeCommentsPostId)!} 
                        currentUser={currentUser} 
                        users={users} 
                        onClose={() => setActiveCommentsPostId(null)} 
                        onComment={handleComment} 
                        onLikeComment={() => {}} 
                        getCommentAuthor={(id) => users.find(u => u.id === id)} 
                        onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); setActiveCommentsPostId(null); }} 
                    />
                )}
                
                {activeSharePostId && currentUser && (
                    <ShareSheet 
                        currentUser={currentUser} 
                        groups={groups} 
                        brands={brands} 
                        postId={activeSharePostId} 
                        onClose={() => setActiveSharePostId(null)} 
                        onShare={(type, id, caption) => handleShare(activeSharePostId, type, id, caption)} 
                        onCopyLink={() => { if(isClient) { navigator.clipboard.writeText(`https://unera.social/posts/${activeSharePostId}`); alert("Link copied!"); } }} 
                    />
                )}
                
                {/* Add other modals with currentUser checks */}
            </>
        );
    };

    // You'll need to add the missing handler functions (handleFollowUser, handleFollowBrand, etc.)
    // but make sure each one checks for currentUser first
    
    return (
        <div className="bg-[#18191A] min-h-screen flex flex-col font-sans">
            {renderContent()}
        </div>
    );
}
