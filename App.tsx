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

// API client with authentication
const apiFetch = async (endpoint: string, options: RequestInit = {}, withAuth = true) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (withAuth) {
        const token = localStorage.getItem('authToken');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || `API Error: ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
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

// Enhanced Facebook-style relative time formatter with precise calculations
const formatRelativeTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    
    // If timestamp is in the future or invalid, return fallback
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
    
    // Check songs array first
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
    
    // Check episodes array
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
    
    // Create song object from audioTrack if not found in arrays
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

// Helper function to get author (user or brand) for a post
const getAuthorForPost = (post: PostType, users: User[], brands: Brand[]) => {
    // First check if it's a brand post
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
    
    // Check if authorId matches a brand
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
    
    // Otherwise it's a user post
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
// Facebook-style image grid arrangement helper
const getImageGridClass = (imageCount: number): string => {
    switch (imageCount) {
        case 1:
            return 'w-full max-w-full h-auto'; // Single image - full width container
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
            return 'w-full max-w-full h-auto max-h-[500px] object-contain rounded-lg'; // Full width for single image
        case 2:
            return 'w-full h-full aspect-square object-cover rounded-lg'; // Square for 2 images
        case 3:
            if (index === 0) return 'row-span-2 w-full h-full aspect-square object-cover rounded-lg'; // First image takes 2 rows
            return 'w-full h-full aspect-square object-cover rounded-lg'; // Others square
        case 4:
            return 'w-full h-full aspect-square object-cover rounded-lg'; // All square for 4 images
        default:
            // For 5+ images, show grid with more than 2 columns
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

    const [users, setUsers] = useState<User[]>(initialData?.users || INITIAL_USERS);
    const [posts, setPosts] = useState<PostType[]>(() => {
        // Ensure all posts have formattedTime on initial load
        const initialPosts = initialData?.posts || INITIAL_POSTS;
        return initialPosts.map(post => ({
            ...post,
            formattedTime: post.formattedTime || formatRelativeTime(post.timestamp || post.createdAt || Date.now())
        }));
    });
    const [stories, setStories] = useState<Story[]>(INITIAL_STORIES.map(s => ({...s, createdAt: Date.now(), user: (initialData?.users || INITIAL_USERS).find((u: User) => u.id === s.userId)}))); 
    const [reels, setReels] = useState<Reel[]>(INITIAL_REELS);
    const [events, setEvents] = useState<Event[]>(INITIAL_EVENTS);
    const [products, setProducts] = useState<Product[]>([]);
    const [groups, setGroups] = useState<Group[]>(INITIAL_GROUPS);
    const [brands, setBrands] = useState<Brand[]>(INITIAL_BRANDS);
    
    // Initialize songs and episodes with proper stats
    const [songs, setSongs] = useState<Song[]>(MOCK_SONGS.map(song => ({
        ...song,
        plays: song.plays || 0,
        likes: song.likes || 0,
        shares: song.shares || 0,
        comments: song.comments || 0,
        stats: song.stats || {
            plays: song.plays || 0,
            likes: song.likes || 0,
            shares: song.shares || 0,
            comments: song.comments || 0,
            downloads: 0,
            reelsUse: 0
        }
    })));
    
    const [episodes, setEpisodes] = useState<Episode[]>(MOCK_EPISODES.map(episode => ({
        ...episode,
        plays: episode.plays || 0,
        likes: episode.likes || 0,
        shares: episode.shares || 0,
        comments: episode.comments || 0,
        stats: episode.stats || {
            plays: episode.plays || 0,
            likes: episode.likes || 0,
            shares: episode.shares || 0,
            comments: episode.comments || 0,
            downloads: 0,
            reelsUse: 0
        }
    })));
    
    const [currentUser, setCurrentUser] = useState<User | null>(initialData?.currentUser || null);
    const [showRegister, setShowRegister] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [loginError, setLoginError] = useState('');
    
    // Loading states
    const [isLoading, setIsLoading] = useState(true);
    const [loadingStates, setLoadingStates] = useState({
        users: false,
        posts: false,
        stories: false,
        reels: false,
        events: false,
        products: false,
        groups: false,
        brands: false,
        songs: false,
        episodes: false,
        notifications: false
    });
    
    const serverPath = initialPath || '/';
    const clientPath = isClient ? getPath() : serverPath;
    const path = clientPath;
    
    // Update parsedPath to include users dependency
    const parsedPath = useMemo(() => parsePath(path, users), [path, users]);
    
    const [activeTab, setActiveTab] = useState(parsedPath.view === 'home' ? 'home' : parsedPath.view);
    const [view, setView] = useState(initialData?.view || parsedPath.view);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(initialData?.selectedUserId || parsedPath.userId || null);
    const [activeReelId, setActiveReelId] = useState<number | null>(null);
    const [activeBrandId, setActiveBrandId] = useState<number | null>(null);
    const [initialGroupIdToView, setInitialGroupIdToView] = useState<string | null>(null);
    const [activeTag, setActiveTag] = useState<string | null>(null);
    
    // Group-specific states
    const [activeGroupComments, setActiveGroupComments] = useState<{groupId: string, postId: number} | null>(null);
    const [activeGroupShare, setActiveGroupShare] = useState<{groupId: string, postId: number} | null>(null);
    
    // Reel modal state
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
        },
        {
            id: 2,
            userId: 1,
            senderId: 3,
            type: 'like',
            content: 'liked your post.',
            postId: 1,
            timestamp: Date.now() - 1800000,
            read: false
        },
        {
            id: 3,
            userId: 1,
            senderId: 4,
            type: 'comment',
            content: 'commented on your post.',
            postId: 1,
            timestamp: Date.now() - 900000,
            read: true
        }
    ]);
    const [activeProduct, setActiveProduct] = useState<Product | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [activeSinglePostId, setActiveSinglePostId] = useState<number | null>(initialData?.activeSinglePostId || parsedPath.postId || null);

    const isAdmin = currentUser?.role === 'admin';

    // ========== API INTEGRATION FUNCTIONS ==========

    // Fetch users from API
    const fetchUsers = async () => {
        setLoadingStates(prev => ({ ...prev, users: true }));
        try {
            const data = await apiFetch('/api/users', { method: 'GET' });
            setUsers(data.data || data);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoadingStates(prev => ({ ...prev, users: false }));
        }
    };

    // Fetch posts from API
    const fetchPosts = async () => {
        setLoadingStates(prev => ({ ...prev, posts: true }));
        try {
            const data = await apiFetch('/api/posts', { method: 'GET' });
            const postsWithFormattedTime = (data.data || data).map((post: PostType) => ({
                ...post,
                formattedTime: post.formattedTime || formatRelativeTime(post.timestamp || post.createdAt || Date.now())
            }));
            setPosts(postsWithFormattedTime);
        } catch (error) {
            console.error('Failed to fetch posts:', error);
        } finally {
            setLoadingStates(prev => ({ ...prev, posts: false }));
        }
    };

    // Fetch feed from API (ranked posts)
    const fetchFeed = async () => {
        setLoadingStates(prev => ({ ...prev, posts: true }));
        try {
            const data = await apiFetch('/api/feed', { method: 'GET' });
            const feedWithFormattedTime = (data.data || data).map((post: PostType) => ({
                ...post,
                formattedTime: post.formattedTime || formatRelativeTime(post.timestamp || post.createdAt || Date.now())
            }));
            setPosts(feedWithFormattedTime);
        } catch (error) {
            console.error('Failed to fetch feed:', error);
        } finally {
            setLoadingStates(prev => ({ ...prev, posts: false }));
        }
    };

    // Fetch stories from API
    const fetchStories = async () => {
        setLoadingStates(prev => ({ ...prev, stories: true }));
        try {
            const data = await apiFetch('/api/stories', { method: 'GET' });
            const storiesWithUsers = (data.data || data).map((story: Story) => ({
                ...story,
                createdAt: Date.now(),
                user: users.find((u: User) => u.id === story.userId)
            }));
            setStories(storiesWithUsers);
        } catch (error) {
            console.error('Failed to fetch stories:', error);
        } finally {
            setLoadingStates(prev => ({ ...prev, stories: false }));
        }
    };

    // Fetch reels from API
    const fetchReels = async () => {
        setLoadingStates(prev => ({ ...prev, reels: true }));
        try {
            const data = await apiFetch('/api/reels', { method: 'GET' });
            setReels(data.data || data);
        } catch (error) {
            console.error('Failed to fetch reels:', error);
        } finally {
            setLoadingStates(prev => ({ ...prev, reels: false }));
        }
    };

    // Fetch events from API
    const fetchEvents = async () => {
        setLoadingStates(prev => ({ ...prev, events: true }));
        try {
            const data = await apiFetch('/api/events', { method: 'GET' });
            setEvents(data.data || data);
        } catch (error) {
            console.error('Failed to fetch events:', error);
        } finally {
            setLoadingStates(prev => ({ ...prev, events: false }));
        }
    };

    // Fetch products from API
    const fetchProducts = async () => {
        setLoadingStates(prev => ({ ...prev, products: true }));
        try {
            const data = await apiFetch('/api/products', { method: 'GET' });
            setProducts(data.data || data);
        } catch (error) {
            console.error('Failed to fetch products:', error);
        } finally {
            setLoadingStates(prev => ({ ...prev, products: false }));
        }
    };

    // Fetch brands from API
    const fetchBrands = async () => {
        setLoadingStates(prev => ({ ...prev, brands: true }));
        try {
            const data = await apiFetch('/api/brands', { method: 'GET' });
            setBrands(data.data || data);
        } catch (error) {
            console.error('Failed to fetch brands:', error);
        } finally {
            setLoadingStates(prev => ({ ...prev, brands: false }));
        }
    };

    // Fetch songs from API
    const fetchSongs = async () => {
        setLoadingStates(prev => ({ ...prev, songs: true }));
        try {
            const data = await apiFetch('/api/songs', { method: 'GET' });
            setSongs((data.data || data).map((song: Song) => ({
                ...song,
                plays: song.plays || 0,
                likes: song.likes || 0,
                shares: song.shares || 0,
                comments: song.comments || 0,
                stats: song.stats || {
                    plays: song.plays || 0,
                    likes: song.likes || 0,
                    shares: song.shares || 0,
                    comments: song.comments || 0,
                    downloads: 0,
                    reelsUse: 0
                }
            })));
        } catch (error) {
            console.error('Failed to fetch songs:', error);
        } finally {
            setLoadingStates(prev => ({ ...prev, songs: false }));
        }
    };

    // Fetch episodes from API
    const fetchEpisodes = async () => {
        setLoadingStates(prev => ({ ...prev, episodes: true }));
        try {
            const data = await apiFetch('/api/podcasts', { method: 'GET' });
            setEpisodes((data.data || data).map((episode: Episode) => ({
                ...episode,
                plays: episode.plays || 0,
                likes: episode.likes || 0,
                shares: episode.shares || 0,
                comments: episode.comments || 0,
                stats: episode.stats || {
                    plays: episode.plays || 0,
                    likes: episode.likes || 0,
                    shares: episode.shares || 0,
                    comments: episode.comments || 0,
                    downloads: 0,
                    reelsUse: 0
                }
            })));
        } catch (error) {
            console.error('Failed to fetch episodes:', error);
        } finally {
            setLoadingStates(prev => ({ ...prev, episodes: false }));
        }
    };

    // Fetch groups from API
    const fetchGroups = async () => {
        setLoadingStates(prev => ({ ...prev, groups: true }));
        try {
            const data = await apiFetch('/api/groups', { method: 'GET' });
            setGroups(data.data || data);
        } catch (error) {
            console.error('Failed to fetch groups:', error);
        } finally {
            setLoadingStates(prev => ({ ...prev, groups: false }));
        }
    };

    // Fetch notifications from API
    const fetchNotifications = async () => {
        if (!currentUser) return;
        
        setLoadingStates(prev => ({ ...prev, notifications: true }));
        try {
            const data = await apiFetch(`/api/notifications?userId=${currentUser.id}`, { method: 'GET' });
            setNotifications(data.data || data);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoadingStates(prev => ({ ...prev, notifications: false }));
        }
    };

    // Initial data loading
    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            try {
                await Promise.all([
                    fetchUsers(),
                    fetchPosts(),
                    fetchStories(),
                    fetchReels(),
                    fetchEvents(),
                    fetchProducts(),
                    fetchBrands(),
                    fetchSongs(),
                    fetchEpisodes(),
                    fetchGroups()
                ]);
                
                if (currentUser) {
                    await fetchNotifications();
                }
            } catch (error) {
                console.error('Failed to load initial data:', error);
            } finally {
                setTimeout(() => setIsLoading(false), 800);
            }
        };

        loadInitialData();
    }, [currentUser]);

    // Polling for real-time updates
    useEffect(() => {
        if (!currentUser) return;

        const pollingInterval = setInterval(async () => {
            try {
                await fetchFeed();
                await fetchNotifications();
                await fetchStories();
                await fetchReels();
            } catch (error) {
                console.error('Polling error:', error);
            }
        }, 10000); // Poll every 10 seconds

        return () => clearInterval(pollingInterval);
    }, [currentUser]);

    const storiesWithUsers = useMemo(() => {
        return stories.map(story => {
            const user = users.find(u => u.id === story.userId);
            return { ...story, user };
        }).sort((a,b) => b.createdAt - a.createdAt);
    }, [stories, users]);

    // Enhanced ranked posts with brand boost using the unified rankFeed function
    const rankedPosts = useMemo(() => {
        // Ensure all posts have formattedTime
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
        
        // Combine all posts including brand posts
        const allContent = [...processedPosts, ...productPosts, ...reelPosts];
        
        // Use the unified rankFeed function that now accepts brands
        return rankFeed(allContent, currentUser, users, brands);
    }, [posts, reels, products, currentUser, users, brands]);

    // ========== FIXED NOTIFICATION MANAGEMENT FUNCTIONS ==========
    const handleCreateNotification = useCallback((
        userId: number,
        senderId: number,
        type: string,
        content: string,
        extraData?: any
    ) => {
        // CRITICAL FIX: Prevent self-notifications
        if (userId === senderId) {
            console.log(`[Notification] Prevented self-notification: ${senderId} -> ${userId} (${type})`);
            return;
        }
        
        if (notificationExists(notifications, userId, senderId, type, extraData?.postId)) {
            return;
        }
        
        const newNotification = createNotification(userId, senderId, type, content, extraData);
        setNotifications(prev => [newNotification, ...prev]);
        
        // Send notification to API
        apiFetch('/api/notifications', {
            method: 'POST',
            body: JSON.stringify(newNotification)
        }).catch(error => console.error('Failed to send notification:', error));
        
        // Optional: Play notification sound
        if (typeof Audio !== 'undefined' && currentUser?.id === userId) {
            const audio = new Audio('/notification.mp3');
            audio.volume = 0.3;
            audio.play().catch(() => {});
        }
    }, [notifications, currentUser?.id]);

    const handleMarkNotificationRead = async (notificationId: number) => {
        setNotifications(prev => 
            prev.map(notif => 
                notif.id === notificationId ? { ...notif, read: true } : notif
            )
        );
        
        // Update on API
        try {
            await apiFetch(`/api/notifications/${notificationId}`, {
                method: 'PATCH',
                body: JSON.stringify({ read: true })
            });
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    const handleMarkAllNotificationsRead = async () => {
        setNotifications(prev => 
            prev.map(notif => ({ ...notif, read: true }))
        );
        
        // Update on API
        if (currentUser) {
            try {
                await apiFetch(`/api/notifications/mark-all-read?userId=${currentUser.id}`, {
                    method: 'POST'
                });
            } catch (error) {
                console.error('Failed to mark all notifications as read:', error);
            }
        }
    };

    const handleNotificationClick = (notification: Notification) => {
        // Mark as read
        handleMarkNotificationRead(notification.id);
        
        // Handle navigation based on notification type
        if (notification.postId) {
            setActiveSinglePostId(notification.postId);
            setView('single_post');
        } else if (notification.groupId) {
            setInitialGroupIdToView(notification.groupId);
            setView('groups');
            setActiveTab('groups');
        } else if (notification.brandId) {
            setActiveBrandId(notification.brandId);
            setView('brands');
            setActiveTab('brands');
        } else if (notification.senderId) {
            setSelectedUserId(notification.senderId);
            setView('profile');
            setActiveTab('profile');
        }
    };

    // ========== AUTHENTICATION FUNCTIONS WITH API ==========
    const handleLogin = async (email: string, password: string) => {
        setLoginError('');
        try {
            const data = await apiFetch('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            }, false);
            
            if (data.success && data.user) {
                setCurrentUser(data.user);
                localStorage.setItem('authToken', data.token);
                setView('home');
                setActiveTab('home');
                setShowRegister(false);
                setShowForgotPassword(false);
                
                // Fetch user-specific data
                await Promise.all([
                    fetchNotifications(),
                    fetchFeed()
                ]);
                
                if (isClient) window.history.pushState({}, '', '/');
            } else {
                setLoginError(data.message || 'Invalid email or password');
            }
        } catch (error: any) {
            setLoginError(error.message || 'Login failed. Please try again.');
        }
    };

    const handleRegister = async (newUser: Partial<User>) => {
        try {
            const data = await apiFetch('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify(newUser)
            }, false);
            
            if (data.success && data.user) {
                setCurrentUser(data.user);
                localStorage.setItem('authToken', data.token);
                setShowRegister(false);
                setShowForgotPassword(false);
                setView('home');
                
                // Fetch initial data
                await fetchUsers();
                
                if (isClient) window.history.pushState({}, '', '/');
            } else {
                setLoginError(data.message || 'Registration failed');
            }
        } catch (error: any) {
            setLoginError(error.message || 'Registration failed. Please try again.');
        }
    };

    const handleLogout = () => {
        // Clear API token
        localStorage.removeItem('authToken');
        
        setCurrentUser(null);
        if (isClient) {
            localStorage.removeItem('universeCurrentUser');
            window.history.pushState({}, '', '/');
        }
        setView('login');
        setCurrentAudioTrack(null);
        setIsAudioPlaying(false);
    };

    const handleTagClick = (tag: string) => {
        setActiveTag(tag.replace('#', ''));
        setView('tag_feed');
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
        if (!currentUser) return;
        
        // Create form data for file upload
        const formData = new FormData();
        formData.append('authorId', currentUser.id.toString());
        formData.append('content', text);
        formData.append('type', type === 'multimage' ? 'image' : (type === 'video' ? 'video' : (type || 'text')));
        formData.append('visibility', visibility || 'Public');
        
        if (location) formData.append('location', location);
        if (feeling) formData.append('feeling', feeling);
        if (taggedUsers && taggedUsers.length > 0) formData.append('taggedUsers', JSON.stringify(taggedUsers));
        if (background) formData.append('background', background);
        if (linkPreview) formData.append('linkPreview', JSON.stringify(linkPreview));
        
        if (files && files.length > 0) {
            files.forEach(file => {
                formData.append('files', file);
            });
        }
        
        try {
            const data = await apiFetch('/api/posts', {
                method: 'POST',
                body: formData,
                headers: {} // Remove Content-Type header for FormData
            });
            
            if (data.success) {
                // Add the new post to local state
                const newPost = data.data || data.post;
                const postWithFormattedTime = {
                    ...newPost,
                    formattedTime: formatRelativeTime(newPost.timestamp || newPost.createdAt || Date.now())
                };
                setPosts(prev => [postWithFormattedTime, ...prev]);
                
                // Enhanced notification logic for tagged users with self-notification prevention
                if (taggedUsers && taggedUsers.length > 0) {
                    taggedUsers.forEach(userId => {
                        if (userId !== currentUser.id) { // PREVENT SELF-NOTIFICATION
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
                
                // Handle mentions in post content with self-notification prevention
                const mentionRegex = /@(\w+(?:\s\w+)?)/g;
                const mentions = [...text.matchAll(mentionRegex)];
                if (mentions.length > 0) {
                    const mentionedUserIds = new Set<number>();
                    mentions.forEach(match => {
                        const userName = match[1];
                        const user = users.find(u => u.name.toLowerCase() === userName.toLowerCase());
                        if (user && user.id !== currentUser.id && !taggedUsers?.includes(user.id)) { // PREVENT SELF-NOTIFICATION
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
            }
        } catch (error) {
            console.error('Failed to create post:', error);
            alert('Failed to create post. Please try again.');
        }
    };

    // FIXED: Prevent self-notifications for reactions
    const handleReact = async (itemId: number, type: ReactionType) => {
        if (!currentUser) return alert("Please login to react.");
        
        try {
            const response = await apiFetch('/api/reactions', {
                method: 'POST',
                body: JSON.stringify({
                    postId: itemId,
                    userId: currentUser.id,
                    type
                })
            });
            
            if (response.success) {
                // Update local state
                setPosts(prev => prev.map(post => {
                    if (post.id === itemId) {
                        const existing = post.reactions.find(r => r.userId === currentUser.id);
                        let newReactions = [...post.reactions];
                        if (existing) {
                            if (existing.type === type) {
                                newReactions = newReactions.filter(r => r.userId !== currentUser.id);
                            } else {
                                newReactions = newReactions.map(r => r.userId === currentUser.id ? { ...r, type } : r);
                            }
                        } else {
                            newReactions.push({ userId: currentUser.id, type });
                            
                            // Send notification to post author (prevent self-reacting notifications)
                            if (post.authorId !== currentUser.id) { // PREVENT SELF-NOTIFICATION
                                const content = type === 'like' 
                                    ? 'liked your post.' 
                                    : `reacted with ${type} to your post.`;
                                
                                handleCreateNotification(
                                    post.authorId,
                                    currentUser.id,
                                    `like_${type === 'like' ? 'post' : 'reaction'}`,
                                    content,
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
            console.error('Failed to add reaction:', error);
        }
    };

    // FIXED: Prevent self-notifications for comments
    const handleComment = async (itemId: number, text: string, attachment?: any, parentId?: number) => {
        if (!currentUser) return;
        
        try {
            const response = await apiFetch('/api/comments', {
                method: 'POST',
                body: JSON.stringify({
                    postId: itemId,
                    userId: currentUser.id,
                    text,
                    attachment,
                    parentId
                })
            });
            
            if (response.success) {
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
                        const updatedComments = [...p.comments, newComment];
                        
                        // Send notification to post author (prevent self-commenting notifications)
                        if (p.authorId !== currentUser.id) { // PREVENT SELF-NOTIFICATION
                            handleCreateNotification(
                                p.authorId,
                                currentUser.id,
                                'comment_post',
                                'commented on your post.',
                                { postId: itemId, commentId: newComment.id }
                            );
                        }
                        
                        // Handle mentions in comments with self-notification prevention
                        const mentionRegex = /@(\w+(?:\s\w+)?)/g;
                        const mentions = [...text.matchAll(mentionRegex)];
                        if (mentions.length > 0) {
                            const mentionedUserIds = new Set<number>();
                            mentions.forEach(match => {
                                const userName = match[1];
                                const user = users.find(u => u.name.toLowerCase() === userName.toLowerCase());
                                if (user && user.id !== currentUser.id) { // PREVENT SELF-NOTIFICATION
                                    mentionedUserIds.add(user.id);
                                    
                                    // Send mention notification
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
            console.error('Failed to add comment:', error);
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
        
        // Check permissions
        const canDelete = isAdmin || post.authorId === currentUser.id;
        if (!canDelete) {
            // For brand posts, check if user is brand admin
            if (post.brandId) {
                const brand = brands.find(b => b.id === post.brandId);
                if (brand && brand.adminId === currentUser.id) {
                    // Brand admin can delete brand posts
                } else {
                    alert("You can only delete your own posts.");
                    return;
                }
            } else if (post.groupId) {
                const group = groups.find(g => g.id === post.groupId);
                if (group && group.adminId === currentUser.id) {
                    // Group admin can delete group posts
                } else {
                    alert("You can only delete your own posts.");
                    return;
                }
            } else {
                alert("You can only delete your own posts.");
                return;
            }
        }
        
        if (window.confirm("Are you sure you want to delete this post?")) {
            try {
                const response = await apiFetch(`/api/posts/${postId}`, {
                    method: 'DELETE'
                });
                
                if (response.success) {
                    // Remove from main posts
                    setPosts(prev => prev.filter(p => p.id !== postId));
                    
                    // Remove from brand posts if applicable
                    if (post.brandId) {
                        setBrands(prev => prev.map(brand => ({
                            ...brand,
                            posts: brand.id === post.brandId 
                                ? (brand.posts || []).filter(id => id !== postId)
                                : (brand.posts || [])
                        })));
                    }
                    
                    // Also remove from group posts if applicable
                    if (post.groupId) {
                        setGroups(prev => prev.map(group => ({
                            ...group,
                            posts: group.id === post.groupId 
                                ? group.posts.filter(p => p.id !== postId)
                                : group.posts
                        })));
                    }
                    
                    alert("Post deleted successfully!");
                }
            } catch (error) {
                console.error('Failed to delete post:', error);
                alert('Failed to delete post. Please try again.');
            }
        }
    };

    // ========== USER FUNCTIONS WITH API ==========
    const handleFollowUser = async (userIdToToggle: number) => {
        if (!currentUser) {
            alert("Please login to follow users.");
            return;
        }
        const currentUserId = currentUser.id;

        const isCurrentlyFollowing = currentUser.following.includes(userIdToToggle);

        try {
            const response = await apiFetch('/api/follow', {
                method: 'POST',
                body: JSON.stringify({
                    followerId: currentUserId,
                    followingId: userIdToToggle,
                    action: isCurrentlyFollowing ? 'unfollow' : 'follow'
                })
            });

            if (response.success) {
                // Send follow notification if not already following AND not following yourself
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
            }
        } catch (error) {
            console.error('Failed to follow/unfollow user:', error);
            alert('Failed to follow user. Please try again.');
        }
    };

    // ========== BRAND FUNCTIONS WITH API ==========
    const handleCreateBrand = async (brandData: Partial<Brand>) => {
        if (!currentUser) {
            alert("Please login to create a brand page.");
            return;
        }
        
        try {
            const response = await apiFetch('/api/brands', {
                method: 'POST',
                body: JSON.stringify({
                    ...brandData,
                    adminId: currentUser.id
                })
            });
            
            if (response.success) {
                const newBrand = response.data || response.brand;
                setBrands(prev => [newBrand, ...prev]);
                
                // Also add the brand to user's following list
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
                
                alert("Brand page created successfully! You are now following this page.");
            }
        } catch (error) {
            console.error('Failed to create brand:', error);
            alert('Failed to create brand. Please try again.');
        }
    };

    const handlePostAsBrand = async (
        brandId: number, 
        content: any
    ) => {
        if (!currentUser) {
            alert("Please login to post as a brand.");
            return;
        }
        
        // Destructure all parameters
        const { 
            text, 
            files, 
            type, 
            visibility, 
            location, 
            feeling, 
            taggedUsers, 
            background, 
            linkPreview 
        } = content;
        
        // Verify the current user is admin of this brand
        const brand = brands.find(b => b.id === brandId);
        if (!brand) {
            alert("Brand not found.");
            return;
        }
        
        if (brand.adminId !== currentUser.id && !isAdmin) {
            alert("You don't have permission to post as this brand.");
            return;
        }
        
        // Create form data for file upload
        const formData = new FormData();
        formData.append('authorId', brandId.toString());
        formData.append('content', text);
        formData.append('type', type === 'multimage' ? 'image' : (type === 'video' ? 'video' : (type || 'text')));
        formData.append('visibility', visibility || 'Public');
        formData.append('brandId', brandId.toString());
        
        if (location) formData.append('location', location);
        if (feeling) formData.append('feeling', feeling);
        if (taggedUsers && taggedUsers.length > 0) formData.append('taggedUsers', JSON.stringify(taggedUsers));
        if (background) formData.append('background', background);
        if (linkPreview) formData.append('linkPreview', JSON.stringify(linkPreview));
        
        if (files && files.length > 0) {
            files.forEach(file => {
                formData.append('files', file);
            });
        }
        
        try {
            const response = await apiFetch('/api/posts', {
                method: 'POST',
                body: formData,
                headers: {} // Remove Content-Type header for FormData
            });
            
            if (response.success) {
                const newPost = response.data || response.post;
                const postWithFormattedTime = {
                    ...newPost,
                    formattedTime: formatRelativeTime(newPost.timestamp || newPost.createdAt || Date.now())
                };
                
                // Add to main posts array
                setPosts(prev => [postWithFormattedTime, ...prev]);
                
                // Update brand's posts array
                setBrands(prev => prev.map(b => 
                    b.id === brandId 
                        ? { ...b, posts: [...(b.posts || []), newPost.id] }
                        : b
                ));
                
                // Notify brand followers (excluding the current user to prevent self-notification)
                brand.followers.forEach(followerId => {
                    if (followerId !== currentUser.id) { // PREVENT SELF-NOTIFICATION
                        handleCreateNotification(
                            followerId,
                            currentUser.id,
                            'brand_post',
                            `${brand.name} posted: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`,
                            { brandId, postId: newPost.id }
                        );
                    }
                });
                
                // Enhanced notification logic for tagged users in brand posts with self-notification prevention
                if (taggedUsers && taggedUsers.length > 0) {
                    taggedUsers.forEach(userId => {
                        if (userId !== currentUser.id) { // PREVENT SELF-NOTIFICATION
                            handleCreateNotification(
                                userId,
                                currentUser.id,
                                'tag_post',
                                `${brand.name} tagged you in a post.`,
                                { postId: newPost.id, brandId }
                            );
                        }
                    });
                }
                
                alert("Brand post published successfully!");
                return newPost;
            }
        } catch (error) {
            console.error('Failed to create brand post:', error);
            alert('Failed to publish brand post. Please try again.');
        }
    };

    const handleFollowBrand = async (brandId: number) => {
        if (!currentUser) return alert("Login to follow brands.");
        
        try {
            const brand = brands.find(b => b.id === brandId);
            if (!brand) return;
            
            const isFollowing = brand.followers.includes(currentUser.id);
            
            const response = await apiFetch('/api/brands/follow', {
                method: 'POST',
                body: JSON.stringify({
                    userId: currentUser.id,
                    brandId,
                    action: isFollowing ? 'unfollow' : 'follow'
                })
            });
            
            if (response.success) {
                setBrands(prev => prev.map(b => {
                    if (b.id === brandId) {
                        const updatedFollowers = isFollowing 
                            ? b.followers.filter(id => id !== currentUser!.id) 
                            : [...b.followers, currentUser!.id];
                        
                        // Send notification to brand admin if following (prevent self-notification)
                        if (!isFollowing && b.adminId !== currentUser.id) { // PREVENT SELF-NOTIFICATION
                            handleCreateNotification(
                                b.adminId,
                                currentUser.id,
                                'brand_follow',
                                `followed your brand ${b.name}.`,
                                { brandId }
                            );
                        }
                        
                        // Update user's following list as well
                        if (currentUser) {
                            const updatedFollowing = isFollowing
                                ? currentUser.following.filter(id => id !== brandId)
                                : [...currentUser.following, brandId];
                            
                            setCurrentUser(prev => prev ? { ...prev, following: updatedFollowing } : prev);
                            
                            setUsers(prev => prev.map(user => 
                                user.id === currentUser.id 
                                    ? { ...user, following: updatedFollowing }
                                    : user
                            ));
                        }
                        
                        return { 
                            ...b, 
                            followers: updatedFollowers
                        };
                    }
                    return b;
                }));
            }
        } catch (error) {
            console.error('Failed to follow/unfollow brand:', error);
            alert('Failed to follow brand. Please try again.');
        }
    };

    // ========== PRODUCT FUNCTIONS WITH API ==========
    const handleCreateProduct = async (productData: Partial<Product>) => {
        console.log("Creating product with data:", productData);
        
        if (!currentUser) {
            alert("Please login to create a product listing.");
            return;
        }

        try {
            const formData = new FormData();
            formData.append('sellerId', currentUser.id.toString());
            formData.append('sellerName', currentUser.name);
            formData.append('sellerAvatar', currentUser.profileImage || 'https://via.placeholder.com/150');
            formData.append('title', productData.title || 'Untitled');
            formData.append('description', productData.description || '');
            formData.append('category', productData.category || 'other');
            formData.append('mainPrice', productData.mainPrice?.toString() || '0');
            if (productData.discountPrice) formData.append('discountPrice', productData.discountPrice.toString());
            formData.append('quantity', productData.quantity?.toString() || '1');
            formData.append('address', productData.address || '');
            formData.append('country', productData.country || 'US');
            formData.append('phoneNumber', productData.phoneNumber || '');
            
            if (productData.images && productData.images.length > 0) {
                formData.append('images', JSON.stringify(productData.images));
            }

            const response = await apiFetch('/api/products', {
                method: 'POST',
                body: formData,
                headers: {} // Remove Content-Type header for FormData
            });

            if (response.success) {
                const newProduct = response.data || response.product;
                console.log("New product created:", newProduct);
                
                // Update products state
                setProducts(prev => [...prev, newProduct]);
                
                // Notify followers about new product (excluding self)
                const followers = currentUser.followers || [];
                followers.forEach(followerId => {
                    if (followerId !== currentUser.id) { // PREVENT SELF-NOTIFICATION
                        handleCreateNotification(
                            followerId,
                            currentUser.id,
                            'product_post',
                            `listed a new product: "${newProduct.title}"`,
                            { productId: newProduct.id }
                        );
                    }
                });
                
                alert("Product listed successfully!");
                return newProduct;
            }
        } catch (error) {
            console.error('Failed to create product:', error);
            alert('Failed to list product. Please try again.');
        }
    };

    // ========== STORY FUNCTIONS WITH API ==========
    const handleCreateStory = async (storyData: Partial<Story>) => {
        if (!currentUser) return;
        
        try {
            const formData = new FormData();
            formData.append('userId', currentUser.id.toString());
            formData.append('type', storyData.type || 'image');
            formData.append('duration', storyData.duration?.toString() || '24');
            
            if (storyData.content) formData.append('content', storyData.content);
            if (storyData.backgroundColor) formData.append('backgroundColor', storyData.backgroundColor);
            if (storyData.textColor) formData.append('textColor', storyData.textColor);
            if (storyData.font) formData.append('font', storyData.font);
            if (storyData.music) formData.append('music', JSON.stringify(storyData.music));
            
            // For file uploads
            if (storyData.mediaUrl) {
                formData.append('media', storyData.mediaUrl);
            }

            const response = await apiFetch('/api/stories', {
                method: 'POST',
                body: formData,
                headers: {} // Remove Content-Type header for FormData
            });

            if (response.success) {
                const timestamp = Date.now();
                const newStory: Story = { 
                    id: timestamp, 
                    userId: currentUser.id, 
                    user: currentUser, 
                    ...storyData, 
                    createdAt: timestamp 
                } as Story;
                setStories(prev => [newStory, ...prev]);
                setShowCreateStoryModal(false);
                
                // Notify followers about new story
                const followers = currentUser.followers || [];
                followers.forEach(followerId => {
                    if (followerId !== currentUser.id) { // PREVENT SELF-NOTIFICATION
                        handleCreateNotification(
                            followerId,
                            currentUser.id,
                            'story_post',
                            'posted a new story.',
                            { storyId: newStory.id }
                        );
                    }
                });
            }
        } catch (error) {
            console.error('Failed to create story:', error);
            alert('Failed to create story. Please try again.');
        }
    };

    // ========== REEL FUNCTIONS WITH API ==========
    const handleCreateReel = async (videoFile: File, caption: string, song?: Song | { name: string, url: string }, effectName?: string) => {
        if (!currentUser) return;
        
        try {
            const formData = new FormData();
            formData.append('userId', currentUser.id.toString());
            formData.append('caption', caption);
            if (song) formData.append('song', JSON.stringify(song));
            if (effectName) formData.append('effectName', effectName);
            formData.append('video', videoFile);

            const response = await apiFetch('/api/reels', {
                method: 'POST',
                body: formData,
                headers: {} // Remove Content-Type header for FormData
            });

            if (response.success) {
                const timestamp = Date.now();
                const newReel: Reel = { 
                    id: timestamp, 
                    userId: currentUser.id, 
                    videoUrl: URL.createObjectURL(videoFile), 
                    caption, 
                    songName: song ? (song as Song).title || (song as {name: string}).name : 'Original Audio', 
                    effectName: effectName, 
                    createdAt: timestamp, 
                    reactions: [], 
                    comments: [], 
                    shares: 0 
                };
                setReels(prev => [newReel, ...prev]);
                setShowCreateReelModal(false);
                
                // Notify followers about new reel
                const followers = currentUser.followers || [];
                followers.forEach(followerId => {
                    if (followerId !== currentUser.id) { // PREVENT SELF-NOTIFICATION
                        handleCreateNotification(
                            followerId,
                            currentUser.id,
                            'reel_post',
                            'posted a new reel.',
                            { reelId: newReel.id }
                        );
                    }
                });
            }
        } catch (error) {
            console.error('Failed to create reel:', error);
            alert('Failed to create reel. Please try again.');
        }
    };

    // ========== EVENT FUNCTIONS WITH API ==========
    const handleCreateEvent = async (eventData: Partial<Event>) => {
        if (!currentUser) return;
        
        try {
            const response = await apiFetch('/api/events', {
                method: 'POST',
                body: JSON.stringify({
                    ...eventData,
                    organizerId: currentUser.id
                })
            });

            if (response.success) {
                const timestamp = Date.now();
                const formattedTime = formatRelativeTime(timestamp);
                const newEvent: Event = { 
                    ...eventData, 
                    id: timestamp, 
                    attendees: [currentUser.id], 
                    interestedIds: [] 
                } as Event;
                setEvents(prev => [newEvent, ...prev]);
                
                // Create event post
                const eventPost: PostType = { 
                    id: timestamp + 1, 
                    authorId: currentUser.id, 
                    content: `is hosting a new event: ${newEvent.title}`, 
                    timestamp: timestamp,
                    formattedTime: formattedTime,
                    createdAt: timestamp, 
                    reactions: [], 
                    comments: [], 
                    shares: 0, 
                    type: 'event', 
                    visibility: 'Public', 
                    event: newEvent, 
                    eventId: newEvent.id 
                };
                setPosts(prev => [eventPost, ...prev]);
                
                // Notify followers about new event
                const followers = currentUser.followers || [];
                followers.forEach(followerId => {
                    if (followerId !== currentUser.id) { // PREVENT SELF-NOTIFICATION
                        handleCreateNotification(
                            followerId,
                            currentUser.id,
                            'event_created',
                            `created a new event: "${newEvent.title}"`,
                            { eventId: newEvent.id }
                        );
                    }
                });
            }
        } catch (error) {
            console.error('Failed to create event:', error);
            alert('Failed to create event. Please try again.');
        }
    };

    const handleJoinEvent = async (eventId: number) => {
        if (!currentUser) return alert("Please login to join events.");
        
        try {
            const response = await apiFetch('/api/events/join', {
                method: 'POST',
                body: JSON.stringify({
                    eventId,
                    userId: currentUser.id
                })
            });

            if (response.success) {
                setEvents(prev => prev.map(ev => {
                    if (ev.id === eventId) {
                        const isAttending = ev.attendees.includes(currentUser!.id);
                        const isInterested = ev.interestedIds?.includes(currentUser!.id);
                        if (isAttending) return ev;
                        if (isInterested) {
                            return { ...ev, interestedIds: ev.interestedIds!.filter(id => id !== currentUser!.id), attendees: [...ev.attendees, currentUser!.id] };
                        }
                        
                        // Send notification to event organizer (prevent self-notification)
                        if (ev.organizerId !== currentUser.id) { // PREVENT SELF-NOTIFICATION
                            handleCreateNotification(
                                ev.organizerId,
                                currentUser.id,
                                'event_interest',
                                'is interested in your event.',
                                { eventId }
                            );
                        }
                        
                        return { ...ev, interestedIds: [...(ev.interestedIds || []), currentUser!.id] };
                    }
                    return ev;
                }));
            }
        } catch (error) {
            console.error('Failed to join event:', error);
            alert('Failed to join event. Please try again.');
        }
    };

    // ========== MUSIC FUNCTIONS WITH API ==========
    const handleAddSong = async (song: Song) => {
        console.log("Adding new song to library:", song);
        
        try {
            const formData = new FormData();
            formData.append('title', song.title);
            formData.append('artist', song.artist);
            formData.append('duration', song.duration?.toString() || '180');
            formData.append('uploaderId', song.uploaderId || currentUser?.id?.toString() || '');
            if (song.audioUrl) formData.append('audio', song.audioUrl);
            if (song.cover) formData.append('cover', song.cover);
            if (song.genre) formData.append('genre', song.genre);
            if (song.description) formData.append('description', song.description);

            const response = await apiFetch('/api/songs', {
                method: 'POST',
                body: formData,
                headers: {} // Remove Content-Type header for FormData
            });

            if (response.success) {
                const newSong = response.data || response.song;
                const completeSong = {
                    ...newSong,
                    plays: newSong.plays || 0,
                    likes: newSong.likes || 0,
                    shares: newSong.shares || 0,
                    comments: newSong.comments || 0,
                    uploadDate: newSong.uploadDate || new Date().toISOString(),
                    stats: newSong.stats || {
                        plays: newSong.plays || 0,
                        likes: newSong.likes || 0,
                        shares: newSong.shares || 0,
                        comments: newSong.comments || 0,
                        downloads: 0,
                        reelsUse: 0
                    }
                };
                
                setSongs(prev => {
                    const exists = prev.find(s => s.id === newSong.id);
                    if (exists) {
                        return prev.map(s => s.id === newSong.id ? completeSong : s);
                    }
                    return [completeSong, ...prev];
                });
                
                // Also create a feed post for the new upload
                if (currentUser) {
                    const timestamp = Date.now();
                    const formattedTime = formatRelativeTime(timestamp);
                    const audioTrack: AudioTrack = {
                        id: newSong.id,
                        title: newSong.title,
                        artist: newSong.artist,
                        duration: typeof newSong.duration === 'string' ? 
                            parseInt(newSong.duration.split(':')[0]) * 60 + parseInt(newSong.duration.split(':')[1]) || 180 : 
                            newSong.duration || 180,
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
                        formattedTime: formattedTime,
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
                    
                    // Notify followers about new music (excluding self)
                    const followers = currentUser.followers || [];
                    followers.forEach(followerId => {
                        if (followerId !== currentUser.id) { // PREVENT SELF-NOTIFICATION
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

    // Enhanced handlePlayTrack with proper play counting
    const handlePlayTrack = async (track: AudioTrack) => { 
        setCurrentAudioTrack(track); 
        setIsAudioPlaying(true); 
        
        // Add to play history
        setPlayHistory(prev => [...prev, {
            trackId: track.id,
            timestamp: Date.now(),
            duration: track.duration
        }]);
        
        // Update play count via API
        try {
            await apiFetch('/api/plays', {
                method: 'POST',
                body: JSON.stringify({
                    trackId: track.id,
                    trackType: track.type,
                    userId: currentUser?.id
                })
            });
            
            // Update local state
            if (track.type === 'music') {
                setSongs(prev => prev.map(song => 
                    song.id === track.id 
                        ? { 
                            ...song, 
                            plays: (song.plays || 0) + 1,
                            stats: {
                                ...song.stats,
                                plays: (song.stats?.plays || 0) + 1
                            }
                        }
                        : song
                ));
            } else if (track.type === 'podcast') {
                setEpisodes(prev => prev.map(episode => 
                    episode.id === track.id 
                        ? { 
                            ...episode, 
                            plays: (episode.plays || 0) + 1,
                            stats: {
                                ...episode.stats,
                                plays: (episode.stats?.plays || 0) + 1
                            }
                        }
                        : episode
                ));
            }
        } catch (error) {
            console.error('Failed to record play:', error);
        }
    };

    // Handle like for music/podcast posts with self-notification prevention
    const handleLikeTrack = async (trackId: string, isLiked: boolean) => {
        try {
            const response = await apiFetch('/api/likes', {
                method: 'POST',
                body: JSON.stringify({
                    trackId,
                    trackType: songs.find(s => s.id === trackId) ? 'song' : 'podcast',
                    userId: currentUser?.id,
                    action: isLiked ? 'unlike' : 'like'
                })
            });

            if (response.success) {
                setLikedTracks(prev => 
                    isLiked 
                        ? prev.filter(id => id !== trackId)
                        : [...prev, trackId]
                );
                
                // Update song/episode like count
                const track = songs.find(s => s.id === trackId) || episodes.find(e => e.id === trackId);
                if (track) {
                    if ('artist' in track) {
                        // It's a song
                        setSongs(prev => prev.map(song => 
                            song.id === trackId 
                                ? { 
                                    ...song, 
                                    likes: isLiked ? Math.max(0, (song.likes || 0) - 1) : (song.likes || 0) + 1,
                                    stats: {
                                        ...song.stats,
                                        likes: isLiked ? Math.max(0, (song.stats?.likes || 0) - 1) : (song.stats?.likes || 0) + 1
                                    }
                                }
                                : song
                        ));
                        
                        // Send notification to song uploader if liking (prevent self-notification)
                        if (!isLiked && track.uploaderId && track.uploaderId !== currentUser?.id) { // PREVENT SELF-NOTIFICATION
                            handleCreateNotification(
                                track.uploaderId,
                                currentUser!.id,
                                'music_like',
                                `liked your song "${track.title}"`,
                                { songId: trackId }
                            );
                        }
                    } else {
                        // It's an episode
                        setEpisodes(prev => prev.map(episode => 
                            episode.id === trackId 
                                ? { 
                                    ...episode, 
                                    likes: isLiked ? Math.max(0, (episode.likes || 0) - 1) : (episode.likes || 0) + 1,
                                    stats: {
                                        ...episode.stats,
                                        likes: isLiked ? Math.max(0, (episode.stats?.likes || 0) - 1) : (episode.stats?.likes || 0) + 1
                                    }
                                }
                                : episode
                        ));
                    }
                }
            }
        } catch (error) {
            console.error('Failed to like/unlike track:', error);
        }
    };

    // ========== GROUP FUNCTIONS WITH API ==========
    const handleCreateGroup = async (groupData: Partial<Group>) => {
        if (!currentUser) return;
        
        try {
            const response = await apiFetch('/api/groups', {
                method: 'POST',
                body: JSON.stringify({
                    ...groupData,
                    adminId: currentUser.id
                })
            });

            if (response.success) {
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
                setGroups(prev => [newGroup, ...prev]);
                
                // Notify followers about new group (excluding self)
                const followers = currentUser.followers || [];
                followers.forEach(followerId => {
                    if (followerId !== currentUser.id) { // PREVENT SELF-NOTIFICATION
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
            console.error('Failed to create group:', error);
            alert('Failed to create group. Please try again.');
        }
    };

    const handleJoinGroup = async (groupId: string) => { 
        if (!currentUser) return; 
        
        try {
            const response = await apiFetch('/api/groups/join', {
                method: 'POST',
                body: JSON.stringify({
                    groupId,
                    userId: currentUser.id
                })
            });

            if (response.success) {
                setGroups(prev => prev.map(g => 
                    (g.id === groupId && !g.members.includes(currentUser.id)) 
                        ? { 
                            ...g, 
                            members: [...g.members, currentUser.id] 
                        } 
                        : g
                )); 
                
                // Notify group admin (prevent self-notification)
                const group = groups.find(g => g.id === groupId);
                if (group && group.adminId !== currentUser.id) { // PREVENT SELF-NOTIFICATION
                    handleCreateNotification(
                        group.adminId,
                        currentUser.id,
                        'group_join',
                        `joined your group ${group.name}.`,
                        { groupId }
                    );
                }
            }
        } catch (error) {
            console.error('Failed to join group:', error);
            alert('Failed to join group. Please try again.');
        }
    };

    // FIXED: Prevent self-notifications in group posts
    const handlePostToGroup = async (groupId: string, content: string, files: File[] | null, type: any, background?: string) => { 
        if (!currentUser) return;
        
        try {
            const formData = new FormData();
            formData.append('authorId', currentUser.id.toString());
            formData.append('groupId', groupId);
            formData.append('content', content);
            formData.append('type', type === 'multimage' ? 'image' : (type === 'video' ? 'video' : (type || 'text')));
            if (background) formData.append('background', background);
            
            if (files && files.length > 0) {
                files.forEach(file => {
                    formData.append('files', file);
                });
            }

            const response = await apiFetch('/api/group-posts', {
                method: 'POST',
                body: formData,
                headers: {} // Remove Content-Type header for FormData
            });

            if (response.success) {
                const newPost = response.data || response.post;
                const timestamp = Date.now();
                const formattedTime = formatRelativeTime(timestamp);
                
                const newGroupPost: GroupPost = { 
                    id: timestamp,
                    authorId: currentUser.id, 
                    content, 
                    images: newPost.images,
                    video: newPost.video,
                    timestamp: timestamp, 
                    formattedTime: formattedTime,
                    reactions: [], 
                    comments: [], 
                    shares: 0,
                    background: background
                }; 
                
                // 1. Update group posts
                setGroups(prev => prev.map(g => 
                    g.id === groupId 
                        ? { ...g, posts: [newGroupPost, ...g.posts] } 
                        : g
                )); 
                
                // 2. Create a proper PostType for the main feed
                const newFeedPost: PostType = { 
                    id: timestamp,
                    authorId: currentUser.id, 
                    content,
                    images: newPost.images,
                    video: newPost.video,
                    timestamp: timestamp,
                    formattedTime: formattedTime,
                    createdAt: timestamp,
                    reactions: [], 
                    comments: [], 
                    shares: 0,
                    views: 0,
                    type: type === 'multimage' ? 'image' : (type === 'video' ? 'video' : (type || 'text')),
                    visibility: 'Public' as const,
                    groupId, 
                    groupName: groups.find(g => g.id === groupId)?.name,
                    background
                }; 
                
                // 3. Add to main posts array
                setPosts(prev => [newFeedPost, ...prev]); 
                
                // Notify group members (excluding the poster to prevent self-notification)
                const group = groups.find(g => g.id === groupId);
                if (group && group.memberPostingAllowed) {
                    group.members.forEach(memberId => {
                        if (memberId !== currentUser.id) { // PREVENT SELF-NOTIFICATION
                            handleCreateNotification(
                                memberId,
                                currentUser.id,
                                'group_post',
                                `posted in ${group.name}`,
                                { groupId, postId: timestamp }
                            );
                        }
                    });
                }
                
                alert("Post published to group successfully!");
            }
        } catch (error) {
            console.error('Failed to post to group:', error);
            alert('Failed to post to group. Please try again.');
        }
    };

    // ========== SHARE FUNCTIONS WITH API ==========
    const handleShare = async (postId: number, targetType: 'profile' | 'group' | 'brand', targetId?: string | number, extraCaption?: string) => {
        if (!currentUser) return;
        const sourcePost = posts.find(p => p.id === postId);
        if (!sourcePost) return;
        
        try {
            const response = await apiFetch('/api/shares', {
                method: 'POST',
                body: JSON.stringify({
                    originalPostId: postId,
                    sharerId: currentUser.id,
                    targetType,
                    targetId,
                    caption: extraCaption
                })
            });

            if (response.success) {
                // Send notification to original post author (prevent self-sharing notifications)
                if (sourcePost.authorId !== currentUser.id) { // PREVENT SELF-NOTIFICATION
                    handleCreateNotification(
                        sourcePost.authorId,
                        currentUser.id,
                        'share_post',
                        'shared your post.',
                        { postId: postId }
                    );
                }
                
                // Check if it's a music/podcast post and update share count
                if (sourcePost.type === 'music' || sourcePost.type === 'podcast') {
                    if (sourcePost.audioTrack) {
                        const song = getSongForPost(sourcePost, songs, episodes);
                        if (song) {
                            handleTrackShare(song.id);
                        }
                    }
                }
                
                const timestamp = Date.now();
                const formattedTime = formatRelativeTime(timestamp);
                const newSharedPost: PostType = { 
                    ...sourcePost, 
                    id: timestamp, 
                    authorId: currentUser.id, 
                    content: extraCaption ? `${extraCaption}\n\n${sourcePost.content || ''}` : sourcePost.content, 
                    timestamp: timestamp,
                    formattedTime: formattedTime,
                    createdAt: timestamp, 
                    reactions: [], 
                    comments: [], 
                    shares: 0, 
                    sharedPostId: sourcePost.id 
                };
                
                if (targetType === 'profile') setPosts([newSharedPost, ...posts]);
                else if (targetType === 'brand' && targetId) {
                    setPosts([{ ...newSharedPost, brandId: Number(targetId) }, ...posts]);
                }
                
                // Update original post share count
                setPosts(prev => prev.map(post => 
                    post.id === postId 
                        ? { ...post, shares: (post.shares || 0) + 1 }
                        : post
                ));
                
                setActiveSharePostId(null);
                alert("Shared successfully!");
            }
        } catch (error) {
            console.error('Failed to share post:', error);
            alert('Failed to share. Please try again.');
        }
    };

    // ========== MISSING FUNCTIONS ==========
    const handleDeleteSong = async (songId: string) => {
        if (!currentUser || !isAdmin) {
            alert("Only admins can delete songs");
            return;
        }
        
        if (window.confirm("Are you sure you want to delete this song?")) {
            try {
                const response = await apiFetch(`/api/songs/${songId}`, {
                    method: 'DELETE'
                });

                if (response.success) {
                    setSongs(prev => prev.filter(s => s.id !== songId));
                    setPosts(prev => prev.filter(p => !p.audioTrack || p.audioTrack.id !== songId));
                    alert("Song deleted successfully");
                }
            } catch (error) {
                console.error('Failed to delete song:', error);
                alert('Failed to delete song. Please try again.');
            }
        }
    };

    const handleDeleteEpisode = async (episodeId: string) => {
        if (!currentUser || !isAdmin) {
            alert("Only admins can delete episodes");
            return;
        }
        
        if (window.confirm("Are you sure you want to delete this episode?")) {
            try {
                const response = await apiFetch(`/api/podcasts/${episodeId}`, {
                    method: 'DELETE'
                });

                if (response.success) {
                    setEpisodes(prev => prev.filter(e => e.id !== episodeId));
                    setPosts(prev => prev.filter(p => !p.audioTrack || p.audioTrack.id !== episodeId));
                    alert("Episode deleted successfully");
                }
            } catch (error) {
                console.error('Failed to delete episode:', error);
                alert('Failed to delete episode. Please try again.');
            }
        }
    };

    const handleVerifyUser = async (userId: number) => { 
        if (isAdmin) {
            try {
                const response = await apiFetch(`/api/users/${userId}/verify`, {
                    method: 'POST',
                    body: JSON.stringify({ verified: !users.find(u => u.id === userId)?.isVerified })
                });

                if (response.success) {
                    setUsers(users.map(u => u.id === userId ? { ...u, isVerified: !u.isVerified } : u));
                    alert(`User ${users.find(u => u.id === userId)?.isVerified ? 'unverified' : 'verified'} successfully!`);
                }
            } catch (error) {
                console.error('Failed to verify user:', error);
                alert('Failed to verify user. Please try again.');
            }
        }
    };
    
    const handleRestrictUser = async (userId: number) => { 
        if (isAdmin) {
            try {
                const response = await apiFetch(`/api/users/${userId}/restrict`, {
                    method: 'POST',
                    body: JSON.stringify({ 
                        restricted: true,
                        restrictedUntil: Date.now() + 24 * 60 * 60 * 1000 
                    })
                });

                if (response.success) {
                    setUsers(users.map(u => u.id === userId ? { ...u, isRestricted: true, restrictedUntil: Date.now() + 24 * 60 * 60 * 1000 } : u));
                    alert("User restricted for 24 hours");
                }
            } catch (error) {
                console.error('Failed to restrict user:', error);
                alert('Failed to restrict user. Please try again.');
            }
        }
    };
    
    const handleDeleteUser = async (userId: number) => { 
        if (isAdmin && window.confirm("Delete this user and all their content? This is irreversible.")) { 
            try {
                const response = await apiFetch(`/api/users/${userId}`, {
                    method: 'DELETE'
                });

                if (response.success) {
                    setUsers(users.filter(u => u.id !== userId)); 
                    setPosts(posts.filter(p => p.authorId !== userId)); 
                    setReels(reels.filter(r => r.userId !== userId)); 
                    setStories(stories.filter(s => s.userId !== userId)); 
                    alert("User deleted successfully");
                }
            } catch (error) {
                console.error('Failed to delete user:', error);
                alert('Failed to delete user. Please try again.');
            }
        } 
    };
    
    const handleMakeModerator = async (userId: number) => { 
        if (isAdmin) {
            try {
                const response = await apiFetch(`/api/users/${userId}/role`, {
                    method: 'PATCH',
                    body: JSON.stringify({ 
                        role: users.find(u => u.id === userId)?.role === 'moderator' ? 'user' : 'moderator' 
                    })
                });

                if (response.success) {
                    setUsers(users.map(u => u.id === userId ? { ...u, role: u.role === 'moderator' ? 'user' : 'moderator' } : u));
                    const user = users.find(u => u.id === userId);
                    alert(`${user?.name} is now ${user?.role === 'moderator' ? 'a user' : 'a moderator'}!`);
                }
            } catch (error) {
                console.error('Failed to update user role:', error);
                alert('Failed to update user role. Please try again.');
            }
        }
    };

    const handleTrackComment = async (trackId: string) => {
        // Update song/episode comment count via API
        const track = songs.find(s => s.id === trackId) || episodes.find(e => e.id === trackId);
        if (track) {
            try {
                const endpoint = 'artist' in track ? `/api/songs/${trackId}/comment` : `/api/podcasts/${trackId}/comment`;
                await apiFetch(endpoint, {
                    method: 'POST',
                    body: JSON.stringify({ increment: 1 })
                });
                
                if ('artist' in track) {
                    setSongs(prev => prev.map(song => 
                        song.id === trackId 
                            ? { 
                                ...song, 
                                comments: (song.comments || 0) + 1,
                                stats: {
                                    ...song.stats,
                                    comments: (song.stats?.comments || 0) + 1
                                }
                            }
                            : song
                    ));
                } else {
                    setEpisodes(prev => prev.map(episode => 
                        episode.id === trackId 
                            ? { 
                                ...episode, 
                                comments: (episode.comments || 0) + 1,
                                stats: {
                                    ...episode.stats,
                                    comments: (episode.stats?.comments || 0) + 1
                                }
                            }
                            : episode
                    ));
                }
            } catch (error) {
                console.error('Failed to update comment count:', error);
            }
        }
    };

    const handleTrackShare = async (trackId: string) => {
        // Update song/episode share count via API
        const track = songs.find(s => s.id === trackId) || episodes.find(e => e.id === trackId);
        if (track) {
            try {
                const endpoint = 'artist' in track ? `/api/songs/${trackId}/share` : `/api/podcasts/${trackId}/share`;
                await apiFetch(endpoint, {
                    method: 'POST',
                    body: JSON.stringify({ increment: 1 })
                });
                
                if ('artist' in track) {
                    setSongs(prev => prev.map(song => 
                        song.id === trackId 
                            ? { 
                                ...song, 
                                shares: (song.shares || 0) + 1,
                                stats: {
                                    ...song.stats,
                                    shares: (song.stats?.shares || 0) + 1
                                }
                            }
                            : song
                    ));
                } else {
                    setEpisodes(prev => prev.map(episode => 
                        episode.id === trackId 
                            ? { 
                                ...episode, 
                                shares: (episode.shares || 0) + 1,
                                stats: {
                                    ...episode.stats,
                                    shares: (episode.stats?.shares || 0) + 1
                                }
                            }
                            : episode
                    ));
                }
            } catch (error) {
                console.error('Failed to update share count:', error);
            }
        }
    };

    const handleUploadToFeed = (song: Song) => {
        console.log("Uploading to feed:", song);
        handleAddSong(song);
    };

    const handleLikeStory = async (storyId: number) => {
        if (!currentUser) { alert("Please login to like stories."); return; }
        
        try {
            const response = await apiFetch('/api/stories/like', {
                method: 'POST',
                body: JSON.stringify({
                    storyId,
                    userId: currentUser.id
                })
            });

            if (response.success) {
                setStories(prev => prev.map(s => {
                    if (s.id === storyId) {
                        const reactions = s.reactions || [];
                        const existingLike = reactions.find(r => r.userId === currentUser!.id);
                        if (existingLike) {
                            return { ...s, reactions: reactions.filter(r => r.userId !== currentUser!.id) };
                        } else {
                            // Send notification to story owner (prevent self-notification)
                            if (s.userId !== currentUser.id) { // PREVENT SELF-NOTIFICATION
                                handleCreateNotification(
                                    s.userId,
                                    currentUser.id,
                                    'like_story',
                                    'liked your story.',
                                    { storyId }
                                );
                            }
                            return { ...s, reactions: [...reactions, { userId: currentUser!.id }] };
                        }
                    }
                    return s;
                }));
            }
        } catch (error) {
            console.error('Failed to like story:', error);
        }
    };
    
    const handleReplyStory = async (storyId: number, text: string) => {
        if (!currentUser) { alert("Please login to reply."); return; }
        
        try {
            const response = await apiFetch('/api/stories/reply', {
                method: 'POST',
                body: JSON.stringify({
                    storyId,
                    userId: currentUser.id,
                    text
                })
            });

            if (response.success) {
                setStories(prev => prev.map(s => {
                    if (s.id === storyId) {
                        const replies = s.replies || [];
                        const newReply = { userId: currentUser!.id, text, timestamp: Date.now() };
                        
                        // Send notification to story owner (prevent self-notification)
                        if (s.userId !== currentUser.id) { // PREVENT SELF-NOTIFICATION
                            handleCreateNotification(
                                s.userId,
                                currentUser.id,
                                'comment_story',
                                'replied to your story.',
                                { storyId }
                            );
                        }
                        
                        return { ...s, replies: [...replies, newReply] };
                    }
                    return s;
                }));
            }
        } catch (error) {
            console.error('Failed to reply to story:', error);
        }
    };

    // FIXED: Prevent self-notifications for reel reactions
    const handleReelReact = async (reelId: number, type: ReactionType | undefined) => {
        if (!currentUser) return alert("Please login to react.");
        
        try {
            const response = await apiFetch('/api/reels/react', {
                method: 'POST',
                body: JSON.stringify({
                    reelId,
                    userId: currentUser.id,
                    type: type || 'like'
                })
            });

            if (response.success) {
                setReels(prev => prev.map(reel => {
                    if (reel.id === reelId) {
                        const existing = reel.reactions.find(r => r.userId === currentUser!.id);
                        let newReactions = [...reel.reactions];
                        if (type === undefined || (existing && existing.type === type)) {
                            newReactions = newReactions.filter(r => r.userId !== currentUser!.id);
                        } else if (existing) {
                            newReactions = newReactions.map(r => r.userId === currentUser!.id ? { ...r, type: type! } : r);
                        } else {
                            newReactions.push({ userId: currentUser!.id, type: type! });
                            
                            // Send notification to reel owner (prevent self-notification)
                            if (reel.userId !== currentUser.id) { // PREVENT SELF-NOTIFICATION
                                const content = type === 'like' 
                                    ? 'liked your reel.' 
                                    : `reacted with ${type} to your reel.`;
                                
                                handleCreateNotification(
                                    reel.userId,
                                    currentUser.id,
                                    'like_reel',
                                    content,
                                    { reelId }
                                );
                            }
                        }
                        return { ...reel, reactions: newReactions };
                    }
                    return reel;
                }));
            }
        } catch (error) {
            console.error('Failed to react to reel:', error);
        }
    };

    // ========== ENHANCED GROUP FUNCTIONS WITH SELF-NOTIFICATION PREVENTION ==========
    const handleGroupComment = async (groupId: string, postId: number, text: string, attachment?: any, parentId?: number) => {
        if (!currentUser) return;
        
        try {
            const response = await apiFetch('/api/group-comments', {
                method: 'POST',
                body: JSON.stringify({
                    groupId,
                    postId,
                    userId: currentUser.id,
                    text,
                    attachment,
                    parentId
                })
            });

            if (response.success) {
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
                
                // Update the group post with new comment
                setGroups(prev => prev.map(g => {
                    if (g.id === groupId) {
                        const updatedPosts = g.posts.map(p => {
                            if (p.id === postId) {
                                const updatedComments = [...(p.comments || []), newComment];
                                
                                // Send notification to post author (prevent self-notification)
                                if (p.authorId !== currentUser.id) { // PREVENT SELF-NOTIFICATION
                                    const group = groups.find(gr => gr.id === groupId);
                                    handleCreateNotification(
                                        p.authorId,
                                        currentUser.id,
                                        'group_comment',
                                        `commented on your post in ${group?.name || 'the group'}.`,
                                        { postId, groupId, commentId: newComment.id }
                                    );
                                }
                                
                                return { ...p, comments: updatedComments };
                            }
                            return p;
                        });
                        return { ...g, posts: updatedPosts };
                    }
                    return g;
                }));

                // Handle mentions in group comments with self-notification prevention
                const mentionRegex = /@(\w+(?:\s\w+)?)/g;
                const mentions = [...text.matchAll(mentionRegex)];
                if (mentions.length > 0) {
                    const mentionedUserIds = new Set<number>();
                    mentions.forEach(match => {
                        const userName = match[1];
                        const user = users.find(u => u.name.toLowerCase() === userName.toLowerCase());
                        if (user && user.id !== currentUser.id) { // PREVENT SELF-NOTIFICATION
                            mentionedUserIds.add(user.id);
                            
                            const group = groups.find(g => g.id === groupId);
                            handleCreateNotification(
                                user.id,
                                currentUser.id,
                                'group_mention',
                                `mentioned you in a comment in ${group?.name || 'a group'}.`,
                                { postId, groupId, commentId: newComment.id }
                            );
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Failed to add group comment:', error);
        }
    };

    const handleInviteToGroup = async (groupId: string, userIds: number[]) => {
        if (!currentUser) return;
        
        try {
            const response = await apiFetch('/api/groups/invite', {
                method: 'POST',
                body: JSON.stringify({
                    groupId,
                    inviterId: currentUser.id,
                    userIds
                })
            });

            if (response.success) {
                setGroups(prev => prev.map(g => 
                    g.id === groupId 
                        ? { 
                            ...g, 
                            members: [...new Set([...g.members, ...userIds])] 
                        } 
                        : g
                ));
                
                // Send notifications to invited users
                const group = groups.find(g => g.id === groupId);
                userIds.forEach(userId => {
                    if (userId !== currentUser.id) { // PREVENT SELF-NOTIFICATION
                        handleCreateNotification(
                            userId,
                            currentUser.id,
                            'group_invite',
                            `invited you to join ${group?.name || 'a group'}.`,
                            { groupId }
                        );
                    }
                });
                
                alert(`Invited ${userIds.length} user(s) to the group!`);
            }
        } catch (error) {
            console.error('Failed to invite to group:', error);
            alert('Failed to invite users. Please try again.');
        }
    };
    
    const handleLeaveGroup = async (groupId: string) => { 
        if (!currentUser) return; 
        
        try {
            const response = await apiFetch('/api/groups/leave', {
                method: 'POST',
                body: JSON.stringify({
                    groupId,
                    userId: currentUser.id
                })
            });

            if (response.success) {
                setGroups(prev => prev.map(g => 
                    (g.id === groupId) 
                        ? { ...g, members: g.members.filter(id => id !== currentUser!.id) } 
                        : g
                )); 
            }
        } catch (error) {
            console.error('Failed to leave group:', error);
            alert('Failed to leave group. Please try again.');
        }
    };
    
    const handleDeleteGroup = async (groupId: string) => { 
        if (!currentUser) return; 
        const group = groups.find(g => g.id === groupId); 
        if (group && (group.adminId === currentUser.id || isAdmin)) { 
            if (window.confirm("Are you sure you want to permanently delete this group?")) { 
                try {
                    const response = await apiFetch(`/api/groups/${groupId}`, {
                        method: 'DELETE'
                    });

                    if (response.success) {
                        setGroups(prev => prev.filter(g => g.id !== groupId)); 
                        alert("Group deleted successfully!");
                    }
                } catch (error) {
                    console.error('Failed to delete group:', error);
                    alert('Failed to delete group. Please try again.');
                }
            } 
        } else {
            alert("You don't have permission to delete this group.");
        }
    };
    
    const handleUpdateGroupImage = async (groupId: string, type: 'cover' | 'profile', file: File) => { 
        try {
            const formData = new FormData();
            formData.append('groupId', groupId);
            formData.append('type', type);
            formData.append('image', file);

            const response = await apiFetch('/api/groups/update-image', {
                method: 'POST',
                body: formData,
                headers: {} // Remove Content-Type header for FormData
            });

            if (response.success) {
                const url = URL.createObjectURL(file); 
                setGroups(prev => prev.map(g => 
                    g.id === groupId 
                        ? (type === 'cover' 
                            ? { ...g, coverImage: url } 
                            : { ...g, image: url }) 
                        : g
                )); 
            }
        } catch (error) {
            console.error('Failed to update group image:', error);
            alert('Failed to update group image. Please try again.');
        }
    };
    
    const handleCreateGroupEvent = async (groupId: string, eventData: Partial<Event>) => {
        if (!currentUser) return;
        
        try {
            const response = await apiFetch('/api/group-events', {
                method: 'POST',
                body: JSON.stringify({
                    ...eventData,
                    groupId,
                    organizerId: currentUser.id
                })
            });

            if (response.success) {
                const timestamp = Date.now();
                const formattedTime = formatRelativeTime(timestamp);
                const newEvent: Event = { 
                    ...eventData, 
                    id: timestamp, 
                    attendees: [currentUser.id], 
                    interestedIds: [],
                    groupId: groupId,
                    groupName: groups.find(g => g.id === groupId)?.name
                } as Event;
                
                // Add event to the group
                setGroups(prev => prev.map(g => 
                    g.id === groupId 
                        ? { ...g, events: [...(g.events || []), newEvent] } 
                        : g
                ));
                
                // Also add to global events
                setEvents(prev => [newEvent, ...prev]);
                
                // Create a post about the event
                const eventPost: PostType = { 
                    id: timestamp + 1, 
                    authorId: currentUser.id, 
                    content: `is hosting a new event in ${groups.find(g => g.id === groupId)?.name}: ${newEvent.title}`, 
                    timestamp: timestamp,
                    formattedTime: formattedTime,
                    createdAt: timestamp, 
                    reactions: [], 
                    comments: [], 
                    shares: 0, 
                    type: 'event', 
                    visibility: 'Public', 
                    event: newEvent, 
                    eventId: newEvent.id,
                    groupId: groupId,
                    groupName: groups.find(g => g.id === groupId)?.name
                };
                setPosts(prev => [eventPost, ...prev]);
            }
        } catch (error) {
            console.error('Failed to create group event:', error);
            alert('Failed to create group event. Please try again.');
        }
    };
    
    // FIXED: Prevent self-notifications in group shares
    const handleGroupShare = async (groupId: string, postId: number, targetType: 'profile' | 'group' | 'brand', targetId?: string | number, extraCaption?: string) => {
        if (!currentUser) return;
        
        // Find the group post
        const group = groups.find(g => g.id === groupId);
        if (!group) return;
        
        const groupPost = group.posts.find(p => p.id === postId);
        if (!groupPost) return;
        
        try {
            const response = await apiFetch('/api/group-shares', {
                method: 'POST',
                body: JSON.stringify({
                    groupId,
                    postId,
                    sharerId: currentUser.id,
                    targetType,
                    targetId,
                    caption: extraCaption
                })
            });

            if (response.success) {
                // Create a shared post for the feed
                const timestamp = Date.now();
                const formattedTime = formatRelativeTime(timestamp);
                const newSharedPost: PostType = {
                    id: timestamp,
                    authorId: currentUser.id,
                    content: extraCaption ? `${extraCaption}\n\nShared from ${group.name}: ${groupPost.content}` : `Shared from ${group.name}: ${groupPost.content}`,
                    images: groupPost.images,
                    video: groupPost.video,
                    timestamp: timestamp,
                    formattedTime: formattedTime,
                    createdAt: timestamp,
                    reactions: [],
                    comments: [],
                    shares: 0,
                    views: 0,
                    type: groupPost.video ? 'video' : (groupPost.images ? 'image' : 'text'),
                    visibility: 'Public',
                    sharedPostId: postId,
                    groupId: groupId,
                    groupName: group.name
                };
                
                // Add to main feed
                setPosts(prev => [newSharedPost, ...prev]);
                
                // Update share count in the group post
                setGroups(prev => prev.map(g => {
                    if (g.id === groupId) {
                        const updatedPosts = g.posts.map(p => {
                            if (p.id === postId) {
                                return { ...p, shares: (p.shares || 0) + 1 };
                            }
                            return p;
                        });
                        return { ...g, posts: updatedPosts };
                    }
                    return g;
                }));
                
                // Send notification to original post author (prevent self-notification)
                if (groupPost.authorId !== currentUser.id) { // PREVENT SELF-NOTIFICATION
                    handleCreateNotification(
                        groupPost.authorId,
                        currentUser.id,
                        'group_share',
                        `shared your post from ${group.name}.`,
                        { postId, groupId }
                    );
                }
                
                setActiveGroupShare(null);
                alert("Shared successfully from group!");
            }
        } catch (error) {
            console.error('Failed to share group post:', error);
            alert('Failed to share group post. Please try again.');
        }
    };
    
    // FIXED: Prevent self-notifications for group post reactions
    const handleReactGroupPost = async (groupId: string, postId: number, type: ReactionType) => { 
        if (!currentUser) return; 
        
        try {
            const response = await apiFetch('/api/group-reactions', {
                method: 'POST',
                body: JSON.stringify({
                    groupId,
                    postId,
                    userId: currentUser.id,
                    type
                })
            });

            if (response.success) {
                setGroups(prev => prev.map(g => {
                    if (g.id === groupId) {
                        const updatedPosts = g.posts.map(p => {
                            if (p.id === postId) {
                                const reactions = p.reactions || [];
                                const existing = reactions.find(r => r.userId === currentUser.id);
                                let newReactions = [...reactions];
                                if (existing) {
                                    if (existing.type === type) {
                                        newReactions = newReactions.filter(r => r.userId !== currentUser!.id);
                                    } else {
                                        newReactions = newReactions.map(r => 
                                            r.userId === currentUser!.id ? { ...r, type } : r
                                        );
                                    }
                                } else {
                                    newReactions.push({ userId: currentUser!.id, type });
                                    
                                    // Send notification to post author (prevent self-notification)
                                    if (p.authorId !== currentUser.id) { // PREVENT SELF-NOTIFICATION
                                        const group = groups.find(g => g.id === groupId);
                                        handleCreateNotification(
                                            p.authorId,
                                            currentUser.id,
                                            'group_reaction',
                                            `reacted to your post in ${group?.name || 'the group'}.`,
                                            { postId, groupId, reactionType: type }
                                        );
                                    }
                                }
                                return { ...p, reactions: newReactions };
                            }
                            return p;
                        });
                        return { ...g, posts: updatedPosts };
                    }
                    return g;
                }));
            }
        } catch (error) {
            console.error('Failed to react to group post:', error);
        }
    };
    
    const handleOpenGroupComments = (groupId: string, postId: number) => {
        console.log('Opening group comments:', { groupId, postId });
        setActiveGroupComments({ groupId, postId });
    };
    
    const handleShareGroupPost = (groupId: string, postId: number) => {
        console.log('Sharing group post:', { groupId, postId });
        setActiveGroupShare({ groupId, postId });
    };
    
    const handleUpdateGroupSettings = async (groupId: string, settings: Partial<Group>) => { 
        try {
            const response = await apiFetch(`/api/groups/${groupId}/settings`, {
                method: 'PATCH',
                body: JSON.stringify(settings)
            });

            if (response.success) {
                setGroups(prev => prev.map(g => 
                    g.id === groupId ? { ...g, ...settings } : g
                )); 
            }
        } catch (error) {
            console.error('Failed to update group settings:', error);
            alert('Failed to update group settings. Please try again.');
        }
    };
    
    const handleRemoveMember = async (groupId: string, memberId: number) => { 
        const group = groups.find(g => g.id === groupId); 
        if (currentUser && group && (group.adminId === currentUser.id || isAdmin)) { 
            try {
                const response = await apiFetch('/api/groups/remove-member', {
                    method: 'POST',
                    body: JSON.stringify({
                        groupId,
                        adminId: currentUser.id,
                        memberId
                    })
                });

                if (response.success) {
                    setGroups(prev => prev.map(g => 
                        g.id === groupId 
                            ? { ...g, members: g.members.filter(id => id !== memberId) } 
                            : g
                    )); 
                    
                    // Notify removed member
                    handleCreateNotification(
                        memberId,
                        currentUser.id,
                        'group_removed',
                        `removed you from ${group.name}.`,
                        { groupId }
                    );
                }
            } catch (error) {
                console.error('Failed to remove member:', error);
                alert('Failed to remove member. Please try again.');
            }
        } 
    };
    
    const handleDeleteGroupPost = async (groupId: string, postId: number) => { 
        const group = groups.find(g => g.id === groupId); 
        const post = group?.posts.find(p => p.id === postId); 
        if (currentUser && group && post && (group.adminId === currentUser.id || isAdmin || post.authorId === currentUser.id)) { 
            if (window.confirm("Are you sure you want to delete this group post?")) {
                try {
                    const response = await apiFetch(`/api/group-posts/${postId}`, {
                        method: 'DELETE',
                        body: JSON.stringify({ groupId })
                    });

                    if (response.success) {
                        setGroups(prev => prev.map(g => 
                            (g.id === groupId) 
                                ? { ...g, posts: g.posts.filter(p => p.id !== postId) } 
                                : g
                        )); 
                        
                        // Also delete from main feed if it exists
                        setPosts(prev => prev.filter(p => !(p.id === postId && p.groupId === groupId)));
                        
                        alert("Group post deleted successfully!");
                    }
                } catch (error) {
                    console.error('Failed to delete group post:', error);
                    alert('Failed to delete group post. Please try again.');
                }
            }
        } else {
            alert("You don't have permission to delete this post.");
        }
    };

    // Birthday notification check with self-notification prevention
    useEffect(() => {
        const checkBirthdays = () => {
            if (!currentUser) return;
            
            const today = new Date();
            const todayStr = `${today.getMonth() + 1}/${today.getDate()}`;
            
            users.forEach(user => {
                if (user.birthDate && user.id !== currentUser.id) { // PREVENT SELF-NOTIFICATION
                    const birthDate = new Date(user.birthDate);
                    const birthStr = `${birthDate.getMonth() + 1}/${birthDate.getDate()}`;
                    
                    if (birthStr === todayStr) {
                        // Check if birthday notification was already sent today
                        const alreadySent = notifications.some(n => 
                            n.type === 'birthday' && 
                            n.senderId === user.id && 
                            new Date(n.timestamp).toDateString() === today.toDateString()
                        );
                        
                        if (!alreadySent) {
                            handleCreateNotification(
                                currentUser.id,
                                user.id,
                                'birthday',
                                `It's ${user.name}'s birthday today!`,
                                {}
                            );
                        }
                    }
                }
            });
        };
        
        // Check birthdays on mount and every 24 hours
        checkBirthdays();
        const interval = setInterval(checkBirthdays, 24 * 60 * 60 * 1000);
        
        return () => clearInterval(interval);
    }, [currentUser, users, notifications, handleCreateNotification]);

    const effectiveView = isClient ? view : (initialData?.view || parsedPath.view);
    
    // Function to render music/podcast posts
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

    // Function to render regular posts with brand support and Facebook-style image grids
    const renderRegularPost = (post: PostType, author: any, isFollowing?: boolean) => {
        const isBrandAuthor = author?.type === 'brand';
        const isFollowingBrand = isBrandAuthor && currentUser ? 
            brands.find(b => b.id === author.id)?.followers.includes(currentUser.id) || false : 
            false;
        
        // Ensure post has formattedTime
        const postWithFormattedTime = {
            ...post,
            formattedTime: post.formattedTime || formatRelativeTime(post.timestamp || post.createdAt || Date.now()),
            // Ensure images property exists and is properly formatted
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
                // Pass image grid utilities
                getImageGridClass={getImageGridClass}
                getImageItemClass={getImageItemClass}
            />
        );
    };
    
    return (
        <div className="bg-[#18191A] min-h-screen flex flex-col font-sans">
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
                        onMarkNotificationsRead={handleMarkAllNotificationsRead} 
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
                                    onDeletePost={(id) => {
                                        if (id > 100000) {
                                            const productId = id - 100000;
                                            setProducts(prev => prev.filter(p => p.id !== productId));
                                        } else {
                                            const postToDelete = posts.find(p => p.id === id);
                                            if (postToDelete && (postToDelete.type === 'music' || postToDelete.type === 'podcast') && postToDelete.audioTrack) {
                                                const trackId = postToDelete.audioTrack.id;
                                                setSongs(prev => prev.filter(s => s.id !== trackId));
                                                setEpisodes(prev => prev.filter(e => e.id !== trackId));
                                            }
                                            setPosts(posts.filter(p => p.id !== id));
                                        }
                                    }} 
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
                                    onHashtagClick={handleTagClick} 
                                    songs={songs}
                                    episodes={episodes}
                                    likedTracks={likedTracks}
                                    onLikeTrack={handleLikeTrack}
                                    onTrackComment={handleTrackComment}
                                    onTrackShare={handleTrackShare}
                                    renderMusicPost={(post: PostType, author: any) => {
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
                                    }}
                                    renderRegularPost={renderRegularPost}
                                    getImageGridClass={getImageGridClass}
                                    getImageItemClass={getImageItemClass}
                                />
                            )}
                            
                            {effectiveView === 'single_post' && activeSinglePostId !== null && (
                                <div className="w-full pt-4 md:px-8 pb-10">
                                    {(() => {
                                        const post = posts.find(p => p.id === activeSinglePostId);
                                        if (!post) return null;
                                        
                                        const author = getAuthorForPost(post, users, brands);
                                        if (!author) return null;
                                        
                                        if ((post.type === 'music' || post.type === 'podcast') && post.audioTrack) {
                                            return renderMusicPost(post, author);
                                        }
                                        
                                        return (
                                            <Post
                                                key={activeSinglePostId}
                                                post={{...post, formattedTime: post.formattedTime || formatRelativeTime(post.timestamp || post.createdAt || Date.now())}}
                                                author={author}
                                                currentUser={currentUser}
                                                users={users}
                                                onProfileClick={(id) => { 
                                                    if (author.type === 'brand') {
                                                        setActiveBrandId(id);
                                                        handleNavigate('brand_view');
                                                    } else {
                                                        setSelectedUserId(id); 
                                                        setView('profile');
                                                    }
                                                }}
                                                onReact={handleReact}
                                                onShare={(id) => setActiveSharePostId(id)}
                                                onViewImage={setFullScreenImage}
                                                onOpenComments={setActiveCommentsPostId}
                                                onVideoClick={() => {}}
                                                onPlayAudioTrack={handlePlayTrack}
                                                onFollow={author.type === 'brand' ? handleFollowBrand : handleFollowUser}
                                                isFollowing={author.type === 'brand' && currentUser ? 
                                                    brands.find(b => b.id === author.id)?.followers.includes(currentUser.id) || false :
                                                    author.type === 'user' && currentUser ?
                                                    currentUser.following.includes(author.id) : false}
                                                onHashtagClick={handleTagClick}
                                                onDeletePost={handleDeletePost}
                                                isAdmin={isAdmin}
                                                getImageGridClass={getImageGridClass}
                                                getImageItemClass={getImageItemClass}
                                            />
                                        );
                                    })()}
                                </div>
                            )}
                            
                            {effectiveView === 'marketplace' && (
                                <MarketplacePage 
                                    products={products} 
                                    currentUser={currentUser} 
                                    onNavigateHome={() => handleNavigate('home')}
                                    onCreateProduct={handleCreateProduct}
                                    onViewProduct={(product) => setActiveProduct(product)}
                                />
                            )}
                            
                            {effectiveView === 'reels' && (
                                <ReelsFeed 
                                    reels={reels} 
                                    users={users} 
                                    currentUser={currentUser} 
                                    activeReelId={activeReelId} 
                                    onReelClick={setActiveReelId} 
                                    onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} 
                                    onNavigate={handleNavigate} 
                                    onReact={handleReelReact}
                                    onShare={(reelId, type) => {
                                        if (type === 'feed') {
                                            const reel = reels.find(r => r.id === reelId);
                                            if (reel && currentUser) {
                                                const timestamp = Date.now();
                                                const formattedTime = formatRelativeTime(timestamp);
                                                const newPost: PostType = { 
                                                    id: timestamp, 
                                                    authorId: currentUser.id, 
                                                    content: `Shared a reel: ${reel.caption}`, 
                                                    video: reel.videoUrl,
                                                    timestamp: timestamp,
                                                    formattedTime: formattedTime,
                                                    createdAt: timestamp, 
                                                    reactions: [], 
                                                    comments: [], 
                                                    shares: 0, 
                                                    views: 0, 
                                                    type: 'video', 
                                                    visibility: 'Public' 
                                                };
                                                setPosts([newPost, ...posts]);
                                                setReels(prev => prev.map(r => 
                                                    r.id === reelId 
                                                        ? { ...r, shares: (r.shares || 0) + 1 }
                                                        : r
                                                ));
                                                
                                                // Send notification to reel owner (prevent self-notification)
                                                if (reel.userId !== currentUser.id) { // PREVENT SELF-NOTIFICATION
                                                    handleCreateNotification(
                                                        reel.userId,
                                                        currentUser.id,
                                                        'reel_share',
                                                        'shared your reel.',
                                                        { reelId }
                                                    );
                                                }
                                                
                                                alert("Reel shared to your feed!");
                                            }
                                        } else if (type === 'copy' && isClient) {
                                            navigator.clipboard.writeText(`https://unera.social/reels/${reelId}`);
                                            alert("Link copied to clipboard!");
                                        }
                                    }}
                                    onComment={(reelId, text) => {
                                        if (!currentUser) return;
                                        const timestamp = Date.now();
                                        const formattedTime = formatRelativeTime(timestamp);
                                        const newComment = { 
                                            id: timestamp, 
                                            userId: currentUser.id, 
                                            text, 
                                            timestamp: timestamp,
                                            formattedTime: formattedTime,
                                            likes: 0,
                                            authorName: currentUser.name,
                                            authorImage: currentUser.profileImage
                                        };
                                        setReels(prev => prev.map(reel => 
                                            reel.id === reelId 
                                                ? { ...reel, comments: [...reel.comments, newComment] }
                                                : reel
                                        ));
                                        
                                        // Send notification to reel owner (prevent self-notification)
                                        const reel = reels.find(r => r.id === reelId);
                                        if (reel && reel.userId !== currentUser.id) { // PREVENT SELF-NOTIFICATION
                                            handleCreateNotification(
                                                reel.userId,
                                                currentUser.id,
                                                'reel_comment',
                                                'commented on your reel.',
                                                { reelId, commentId: newComment.id }
                                            );
                                        }
                                    }}
                                    onCreateReelClick={() => setShowCreateReelModal(true)}
                                    onFollow={handleFollowUser}
                                    getCommentAuthor={(id) => users.find(u => u.id === id)}
                                />
                            )}
                            
                            {effectiveView === 'groups' && (
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
                                        setSelectedUserId(id); 
                                        setView('profile'); 
                                        setActiveTab('profile');
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
                            )}
                            
                            {effectiveView === 'brands' && (
                                <BrandsPage 
                                    currentUser={currentUser}
                                    brands={brands}
                                    posts={posts}
                                    users={users}
                                    onCreateBrand={handleCreateBrand}
                                    onFollowBrand={handleFollowBrand}
                                    onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }}
                                    onPostAsBrand={handlePostAsBrand}
                                    onReact={handleReact}
                                    onShare={(id) => setActiveSharePostId(id)}
                                    onOpenComments={(postId) => setActiveCommentsPostId(postId)}
                                    onUpdateBrand={handleUpdateBrand}
                                    onDeleteBrand={handleDeleteBrand}
                                    onMessage={(brandId) => {
                                        const brand = brands.find(b => b.id === brandId);
                                        if (brand && currentUser) {
                                            alert(`Messaging ${brand.name} - Feature coming soon!`);
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
                            )}
                            
                            {effectiveView === 'events' && (
                                <EventsPage 
                                    events={events} 
                                    users={users} 
                                    currentUser={currentUser} 
                                    onJoinEvent={handleJoinEvent} 
                                    onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} 
                                    onCreateEvent={() => setShowCreateEventModal(true)} 
                                />
                            )}
                            
                            {effectiveView === 'birthdays' && (
                                <BirthdaysPage 
                                    users={users} 
                                    currentUser={currentUser} 
                                    onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} 
                                />
                            )}
                            
                            {effectiveView === 'suggested_profiles' && (
                                <SuggestedProfilesPage 
                                    users={users} 
                                    currentUser={currentUser} 
                                    onFollow={handleFollowUser} 
                                    onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} 
                                />
                            )}
                            
                            {effectiveView === 'memories' && (
                                <MemoriesPage 
                                    posts={posts} 
                                    currentUser={currentUser} 
                                    users={users} 
                                    onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} 
                                    onPostClick={(postId) => { setActiveSinglePostId(postId); setView('single_post'); }} 
                                />
                            )}
                            
                            {effectiveView === 'music' && (
                                <MusicSystem 
                                    songs={songs} 
                                    episodes={episodes} 
                                    currentUser={currentUser} 
                                    onPlayTrack={handlePlayTrack} 
                                    onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} 
                                    onDeleteSong={handleDeleteSong} 
                                    onDeleteEpisode={handleDeleteEpisode} 
                                    likedTracks={likedTracks} 
                                    onToggleLike={handleLikeTrack} 
                                    onUploadToFeed={handleUploadToFeed} 
                                    onAddSong={handleAddSong} 
                                    onAddEpisode={handleAddEpisode} 
                                    playHistory={playHistory}
                                />
                            )}
                            
                            {effectiveView === 'tools' && (
                                <ToolsPage 
                                    currentUser={currentUser} 
                                    onNavigate={handleNavigate} 
                                />
                            )}
                            
                            {effectiveView === 'help_support' && (
                                <HelpSupportPage 
                                    currentUser={currentUser} 
                                />
                            )}
                            
                            {effectiveView === 'settings' && (
                                <SettingsPage 
                                    currentUser={currentUser} 
                                    onUpdateUser={(updates) => { 
                                        if (currentUser) {
                                            const updatedUser = { ...currentUser, ...updates };
                                            setCurrentUser(updatedUser);
                                            setUsers(users.map(u => u.id === currentUser.id ? updatedUser : u));
                                        }
                                    }} 
                                    onLogout={handleLogout} 
                                />
                            )}
                            
                            {effectiveView === 'privacy_policy' && (
                                <PrivacyPolicyPage />
                            )}
                            
                            {effectiveView === 'terms_of_service' && (
                                <TermsOfServicePage />
                            )}
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
                    
                    {/* Regular Post Comments Modal */}
                    {activeCommentsPostId && (
                        <CommentsSheet 
                            post={posts.find(p => p.id === activeCommentsPostId)!} 
                            currentUser={currentUser || INITIAL_USERS[0]} 
                            users={users} 
                            onClose={() => setActiveCommentsPostId(null)} 
                            onComment={handleComment} 
                            onLikeComment={() => {}} 
                            getCommentAuthor={(id) => users.find(u => u.id === id)} 
                            onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); setActiveCommentsPostId(null); }} 
                        />
                    )}
                    
                    {/* Group Post Comments Modal */}
                    {activeGroupComments && (
                        (() => {
                            const { groupId, postId } = activeGroupComments;
                            const group = groups.find(g => g.id === groupId);
                            const groupPost = group?.posts.find(p => p.id === postId);
                            
                            if (group && groupPost) {
                                const postForComments: PostType = {
                                    id: groupPost.id,
                                    authorId: groupPost.authorId,
                                    content: groupPost.content || '',
                                    images: groupPost.images,
                                    video: groupPost.video,
                                    timestamp: groupPost.timestamp,
                                    formattedTime: groupPost.formattedTime || formatRelativeTime(groupPost.timestamp),
                                    createdAt: groupPost.timestamp,
                                    reactions: groupPost.reactions || [],
                                    comments: groupPost.comments || [],
                                    shares: groupPost.shares || 0,
                                    views: 0,
                                    type: groupPost.video ? 'video' : (groupPost.images ? 'image' : 'text'),
                                    visibility: 'Public',
                                    groupId: groupId,
                                    groupName: group.name
                                };
                                
                                return (
                                    <CommentsSheet 
                                        post={postForComments}
                                        currentUser={currentUser || INITIAL_USERS[0]}
                                        users={users}
                                        onClose={() => setActiveGroupComments(null)}
                                        onComment={(postId, text, attachment) => handleGroupComment(groupId, postId, text, attachment)}
                                        onLikeComment={() => {}}
                                        getCommentAuthor={(id) => users.find(u => u.id === id)}
                                        onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); setActiveGroupComments(null); }}
                                        title={`Comments from ${group.name}`}
                                    />
                                );
                            }
                            return null;
                        })()
                    )}
                    
                    {/* Regular Post Share Modal */}
                    {activeSharePostId && (
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
                    
                    {/* Group Post Share Modal */}
                    {activeGroupShare && (
                        (() => {
                            const { groupId, postId } = activeGroupShare;
                            const group = groups.find(g => g.id === groupId);
                            
                            if (group) {
                                return (
                                    <ShareSheet 
                                        currentUser={currentUser} 
                                        groups={groups.filter(g => g.id !== groupId)} // Don't show current group
                                        brands={brands} 
                                        postId={postId} 
                                        onClose={() => setActiveGroupShare(null)} 
                                        onShare={(type, id, caption) => handleGroupShare(groupId, postId, type, id, caption)} 
                                        onCopyLink={() => { 
                                            if(isClient) { 
                                                navigator.clipboard.writeText(`https://unera.social/groups/${groupId}/posts/${postId}`); 
                                                alert("Link copied!"); 
                                            } 
                                        }}
                                        title={`Share post from ${group.name}`}
                                    />
                                );
                            }
                            return null;
                        })()
                    )}
                    
                    {activeStory && (
                        <StoryViewer 
                            story={activeStory} 
                            user={users.find(u => u.id === activeStory.userId)!} 
                            currentUser={currentUser} 
                            allStories={storiesWithUsers} 
                            onClose={() => setActiveStory(null)} 
                            onLike={() => handleLikeStory(activeStory.id)} 
                            onReply={(text) => handleReplyStory(activeStory.id, text)} 
                            onNext={() => {}} 
                            onPrev={() => {}} 
                            onFollow={handleFollowUser} 
                            isFollowing={currentUser ? currentUser.following.includes(activeStory.userId) : false} 
                        />
                    )}
                    {activeChatUser && currentUser && (
                        <ChatWindow 
                            currentUser={currentUser} 
                            recipient={activeChatUser} 
                            messages={messages} 
                            onClose={() => setActiveChatUser(null)} 
                            onSendMessage={() => {}} 
                        />
                    )}
                    {activeProduct && (
                        <ProductDetailModal 
                            product={activeProduct} 
                            currentUser={currentUser} 
                            onClose={() => setActiveProduct(null)} 
                            onMessage={(sid) => setActiveChatUser(users.find(u => u.id === sid) || null)} 
                        />
                    )}
                    {fullScreenImage && (
                        <ImageViewer 
                            imageUrl={fullScreenImage} 
                            onClose={() => setFullScreenImage(null)} 
                        />
                    )}
                </>
            )}
        </div>
    );
}
