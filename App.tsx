
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

// FIXED API CLIENT - Handles your API's array response format
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
            mode: 'cors',
        });

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('API did not return JSON');
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || `API Error: ${response.status}`);
        }

        // CRITICAL FIX: Your API returns arrays directly, not {data: array}
        // Always return {data: array, success: true} format for consistency
        if (Array.isArray(data)) {
            return { data: data, success: true };
        }
        
        // If it's already an object with data property, return as-is
        return data;
    } catch (error) {
        console.error('API Error for', endpoint, ':', error);
        // Return empty data structure to prevent crashes
        return { data: [], success: false, error: error.message };
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

// ========== DATA TRANSFORMATION FUNCTIONS ==========
// Transform API post data to frontend format
const transformPostFromAPI = (apiPost: any): PostType => {
    const timestamp = new Date(apiPost.created_at).getTime() || Date.now();
    
    return {
        id: apiPost.id,
        authorId: apiPost.user_id || apiPost.authorId || 1, // Default to user 1 if missing
        content: apiPost.content || '',
        images: apiPost.media_url && apiPost.media_type === 'image' ? [apiPost.media_url] : undefined,
        video: apiPost.media_url && apiPost.media_type === 'video' ? apiPost.media_url : undefined,
        timestamp: timestamp,
        formattedTime: formatRelativeTime(timestamp),
        createdAt: timestamp,
        reactions: apiPost.reactions || [],
        comments: apiPost.comments || [],
        shares: apiPost.shares || 0,
        views: apiPost.views || 0,
        type: apiPost.media_type || apiPost.type || 'text',
        visibility: apiPost.visibility || 'Public',
        // Optional fields
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

// Transform API user data to frontend format
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

// ========== MAIN APP COMPONENT ==========
export default function App({ initialData, initialPath }: { initialData?: any, initialPath?: string }) {
    const { t } = useLanguage();

    const [isClient, setIsClient] = useState(false);
    useEffect(() => {
        setIsClient(true);
    }, []);

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
    
    const [currentUser, setCurrentUser] = useState<User | null>(INITIAL_USERS[0]);
    const [showRegister, setShowRegister] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [loginError, setLoginError] = useState('');
    
    const [isLoading, setIsLoading] = useState(true);
    
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
        }
    ]);
    const [activeProduct, setActiveProduct] = useState<Product | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [activeSinglePostId, setActiveSinglePostId] = useState<number | null>(parsedPath.postId || null);

    const isAdmin = currentUser?.role === 'admin';

    // ========== API DATA FETCHING ==========

    // Fetch posts from API
    const fetchPosts = async () => {
        try {
            console.log('Fetching posts from API...');
            const response = await apiFetch('/api/posts', { method: 'GET' });
            
            if (response.success && Array.isArray(response.data)) {
                console.log('Posts fetched successfully:', response.data.length);
                const transformedPosts = response.data.map(transformPostFromAPI);
                setPosts(transformedPosts);
            } else {
                console.log('Using initial posts as fallback');
                // Fallback to initial posts
                setPosts(INITIAL_POSTS.map(post => ({
                    ...post,
                    formattedTime: post.formattedTime || formatRelativeTime(post.timestamp || Date.now())
                })));
            }
        } catch (error) {
            console.error('Failed to fetch posts:', error);
            // Fallback to initial posts
            setPosts(INITIAL_POSTS.map(post => ({
                ...post,
                formattedTime: post.formattedTime || formatRelativeTime(post.timestamp || Date.now())
            })));
        }
    };

    // Fetch users from API
    const fetchUsers = async () => {
        try {
            console.log('Fetching users from API...');
            const response = await apiFetch('/api/users', { method: 'GET' });
            
            if (response.success && Array.isArray(response.data)) {
                console.log('Users fetched successfully:', response.data.length);
                const transformedUsers = response.data.map(transformUserFromAPI);
                setUsers(transformedUsers);
                
                // Set current user if not set
                if (!currentUser && transformedUsers.length > 0) {
                    setCurrentUser(transformedUsers[0]);
                }
            } else {
                console.log('Using initial users as fallback');
                setUsers(INITIAL_USERS);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
            setUsers(INITIAL_USERS);
        }
    };

    // Fetch feed from API (ranked posts)
    const fetchFeed = async () => {
        try {
            const response = await apiFetch('/api/feed', { method: 'GET' });
            
            if (response.success && Array.isArray(response.data)) {
                const feedPosts = response.data.map(transformPostFromAPI);
                setPosts(feedPosts);
            }
        } catch (error) {
            console.error('Failed to fetch feed:', error);
        }
    };

    // Initial data loading
    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            console.log('Loading initial data...');
            
            try {
                // Load essential data in sequence
                await fetchUsers();
                await fetchPosts();
                
                console.log('Initial data loaded successfully');
                console.log('Users count:', users.length);
                console.log('Posts count:', posts.length);
                
            } catch (error) {
                console.error('Failed to load initial data:', error);
            } finally {
                setTimeout(() => {
                    setIsLoading(false);
                    console.log('Loading complete');
                }, 500);
            }
        };

        loadInitialData();
    }, []);

    // Load data from localStorage as fallback
    useEffect(() => {
        if (isClient) {
            const storedUser = localStorage.getItem('universeCurrentUser');
            const storedUsers = localStorage.getItem('universeUsers');
            const storedPosts = localStorage.getItem('universePosts');
            
            // Only use localStorage if API failed
            if (users.length === 0 && storedUsers) {
                console.log('Using localStorage users as fallback');
                setUsers(JSON.parse(storedUsers));
            }
            
            if (posts.length === 0 && storedPosts) {
                console.log('Using localStorage posts as fallback');
                const parsedPosts = JSON.parse(storedPosts);
                const postsWithFormattedTime = parsedPosts.map((post: PostType) => ({
                    ...post,
                    formattedTime: post.formattedTime || formatRelativeTime(post.timestamp || Date.now())
                }));
                setPosts(postsWithFormattedTime);
            }
            
            if (!currentUser && storedUser) {
                console.log('Using localStorage current user');
                setCurrentUser(JSON.parse(storedUser));
            }
        }
    }, [isClient]);

    // Save data to localStorage
    useEffect(() => {
        if (isClient && currentUser) {
            localStorage.setItem('universeCurrentUser', JSON.stringify(currentUser));
            localStorage.setItem('universeUsers', JSON.stringify(users));
            localStorage.setItem('universePosts', JSON.stringify(posts));
        }
    }, [currentUser, users, posts, isClient]);

    const storiesWithUsers = useMemo(() => {
        return stories.map(story => {
            const user = users.find(u => u.id === story.userId);
            return { ...story, user };
        }).sort((a,b) => b.createdAt - a.createdAt);
    }, [stories, users]);

    // Enhanced ranked posts
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

    // ========== NOTIFICATION MANAGEMENT ==========
    const handleCreateNotification = useCallback((
        userId: number,
        senderId: number,
        type: string,
        content: string,
        extraData?: any
    ) => {
        // Prevent self-notifications
        if (userId === senderId) {
            return;
        }
        
        if (notificationExists(notifications, userId, senderId, type, extraData?.postId)) {
            return;
        }
        
        const newNotification = createNotification(userId, senderId, type, content, extraData);
        setNotifications(prev => [newNotification, ...prev]);
    }, [notifications]);

    const handleMarkNotificationRead = (notificationId: number) => {
        setNotifications(prev => 
            prev.map(notif => 
                notif.id === notificationId ? { ...notif, read: true } : notif
            )
        );
    };

    const handleMarkAllNotificationsRead = () => {
        setNotifications(prev => 
            prev.map(notif => ({ ...notif, read: true }))
        );
    };

    const handleNotificationClick = (notification: Notification) => {
        handleMarkNotificationRead(notification.id);
        
        if (notification.postId) {
            setActiveSinglePostId(notification.postId);
            setView('single_post');
        } else if (notification.senderId) {
            setSelectedUserId(notification.senderId);
            setView('profile');
            setActiveTab('profile');
        }
    };

    // ========== AUTHENTICATION FUNCTIONS ==========
    const handleLogin = (email: string, pass: string) => {
        const user = users.find(u => u.email === email && u.password === pass);
        if (user) {
            setCurrentUser(user);
            setView('home');
            setActiveTab('home');
            setLoginError('');
            setShowRegister(false);
            setShowForgotPassword(false);
            if (isClient) window.history.pushState({}, '', '/');
        } else {
            setLoginError('Invalid email or password');
        }
    };

    const handleRegister = (newUser: Partial<User>) => {
        const id = Math.max(...users.map(u => u.id)) + 1;
        const user: User = { ...newUser, id, role: 'user', followers: [], following: [], joinedDate: new Date().toISOString() } as User;
        setUsers([...users, user]);
        setCurrentUser(user);
        setShowRegister(false);
        setShowForgotPassword(false);
        setView('home');
        if (isClient) window.history.pushState({}, '', '/');
    };

    const handleLogout = () => {
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
        
        // First update local state for immediate UI response
        setPosts([newPost, ...posts]);
        
        // Then try to save to API
        try {
            const formData = new FormData();
            formData.append('user_id', currentUser.id.toString());
            formData.append('content', text);
            formData.append('visibility', visibility || 'Public');
            
            if (files && files.length > 0) {
                files.forEach(file => {
                    formData.append('media', file);
                });
            }
            
            const response = await apiFetch('/api/posts', {
                method: 'POST',
                body: formData,
                headers: {} // Remove Content-Type for FormData
            });
            
            if (response.success) {
                console.log('Post saved to API successfully');
            }
        } catch (error) {
            console.error('Failed to save post to API:', error);
            // Post will remain in local state
        }
    };

    const handleReact = (itemId: number, type: ReactionType) => {
        if (!currentUser) return alert("Please login to react.");
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
        if (!currentUser) return;
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

    const handleDeletePost = (postId: number) => {
        if (!currentUser) {
            alert("Please login to delete posts.");
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
            
            // Try to delete from API
            try {
                apiFetch(`/api/posts/${postId}`, {
                    method: 'DELETE'
                }).then(response => {
                    if (response.success) {
                        console.log('Post deleted from API');
                    }
                });
            } catch (error) {
                console.error('Failed to delete post from API:', error);
            }
            
            alert("Post deleted successfully!");
        }
    };

    // ========== USER FUNCTIONS ==========
    const handleFollowUser = (userIdToToggle: number) => {
        if (!currentUser) {
            alert("Please login to follow users.");
            return;
        }
        const currentUserId = currentUser.id;

        const isCurrentlyFollowing = currentUser.following.includes(userIdToToggle);

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
    };

    // ========== PRODUCT FUNCTIONS ==========
    const handleCreateProduct = (productData: Partial<Product>) => {
        console.log("Creating product with data:", productData);
        
        if (!currentUser) {
            alert("Please login to create a product listing.");
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

        console.log("New product created:", newProduct);
        
        setProducts(prev => [...prev, newProduct]);
        
        alert("Product listed successfully!");
        
        return newProduct;
    };

    const handleCreateStory = (storyData: Partial<Story>) => {
        if (!currentUser) return;
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
    };

    const handleCreateReel = (videoFile: File, caption: string, song?: Song | { name: string, url: string }, effectName?: string) => {
        if (!currentUser) return;
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
    };

    const handleCreateEvent = (eventData: Partial<Event>) => {
        if (!currentUser) return;
        const timestamp = Date.now();
        const formattedTime = formatRelativeTime(timestamp);
        const newEvent: Event = { 
            ...eventData, 
            id: timestamp, 
            attendees: [currentUser.id], 
            interestedIds: [] 
        } as Event;
        setEvents(prev => [newEvent, ...prev]);
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
    };

    const handleJoinEvent = (eventId: number) => {
        if (!currentUser) return alert("Please login to join events.");
        setEvents(prev => prev.map(ev => {
            if (ev.id === eventId) {
                const isAttending = ev.attendees.includes(currentUser!.id);
                const isInterested = ev.interestedIds?.includes(currentUser!.id);
                if (isAttending) return ev;
                if (isInterested) {
                    return { ...ev, interestedIds: ev.interestedIds!.filter(id => id !== currentUser!.id), attendees: [...ev.attendees, currentUser!.id] };
                }
                return { ...ev, interestedIds: [...(ev.interestedIds || []), currentUser!.id] };
            }
            return ev;
        }));
    };

    const handleShare = (postId: number, targetType: 'profile' | 'group' | 'brand', targetId?: string | number, extraCaption?: string) => {
        if (!currentUser) return;
        const sourcePost = posts.find(p => p.id === postId);
        if (!sourcePost) return;
        
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
    };

    const handleFeedPost = (data: any) => {
        if (!currentUser) return;
        const timestamp = Date.now();
        const formattedTime = formatRelativeTime(timestamp);
        const newPost: PostType = { 
            id: timestamp, 
            authorId: currentUser.id, 
            content: data.content, 
            timestamp: timestamp,
            formattedTime: formattedTime,
            createdAt: timestamp, 
            reactions: [], 
            comments: [], 
            shares: 0, 
            views: 0, 
            type: data.type || 'text', 
            visibility: 'Public', 
            audioTrack: data.audioTrack 
        };
        setPosts([newPost, ...posts]);
    };

    const handleAddSong = (song: Song) => {
        console.log("Adding new song to library:", song);
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
        
        setSongs(prev => {
            const exists = prev.find(s => s.id === song.id);
            if (exists) {
                return prev.map(s => s.id === song.id ? newSong : s);
            }
            return [newSong, ...prev];
        });
    };

    const handleUploadToFeed = (song: Song) => {
        console.log("Uploading to feed:", song);
        handleAddSong(song);
    };

    const handlePlayTrack = (track: AudioTrack) => { 
        setCurrentAudioTrack(track); 
        setIsAudioPlaying(true); 
        
        setPlayHistory(prev => [...prev, {
            trackId: track.id,
            timestamp: Date.now(),
            duration: track.duration
        }]);
    };

    const handleLikeTrack = (trackId: string, isLiked: boolean) => {
        setLikedTracks(prev => 
            isLiked 
                ? prev.filter(id => id !== trackId)
                : [...prev, trackId]
        );
    };

    const handleTrackComment = (trackId: string) => {
        // Track comment logic
    };

    const handleTrackShare = (trackId: string) => {
        // Track share logic
    };

    // ========== MISSING FUNCTIONS ==========
    const handleDeleteSong = (songId: string) => {
        if (!currentUser || !isAdmin) {
            alert("Only admins can delete songs");
            return;
        }
        
        if (window.confirm("Are you sure you want to delete this song?")) {
            setSongs(prev => prev.filter(s => s.id !== songId));
            setPosts(prev => prev.filter(p => !p.audioTrack || p.audioTrack.id !== songId));
            alert("Song deleted successfully");
        }
    };

    const handleDeleteEpisode = (episodeId: string) => {
        if (!currentUser || !isAdmin) {
            alert("Only admins can delete episodes");
            return;
        }
        
        if (window.confirm("Are you sure you want to delete this episode?")) {
            setEpisodes(prev => prev.filter(e => e.id !== episodeId));
            setPosts(prev => prev.filter(p => !p.audioTrack || p.audioTrack.id !== episodeId));
            alert("Episode deleted successfully");
        }
    };

    const handleVerifyUser = (userId: number) => { 
        if (isAdmin) {
            setUsers(users.map(u => u.id === userId ? { ...u, isVerified: !u.isVerified } : u));
            alert(`User ${users.find(u => u.id === userId)?.isVerified ? 'unverified' : 'verified'} successfully!`);
        }
    };
    
    const handleRestrictUser = (userId: number) => { 
        if (isAdmin) {
            setUsers(users.map(u => u.id === userId ? { ...u, isRestricted: true, restrictedUntil: Date.now() + 24 * 60 * 60 * 1000 } : u));
            alert("User restricted for 24 hours");
        }
    };
    
    const handleDeleteUser = (userId: number) => { 
        if (isAdmin && window.confirm("Delete this user and all their content? This is irreversible.")) { 
            setUsers(users.filter(u => u.id !== userId)); 
            setPosts(posts.filter(p => p.authorId !== userId)); 
            setReels(reels.filter(r => r.userId !== userId)); 
            setStories(stories.filter(s => s.userId !== userId)); 
            alert("User deleted successfully");
        } 
    };
    
    const handleMakeModerator = (userId: number) => { 
        if (isAdmin) {
            setUsers(users.map(u => u.id === userId ? { ...u, role: u.role === 'moderator' ? 'user' : 'moderator' } : u));
            const user = users.find(u => u.id === userId);
            alert(`${user?.name} is now ${user?.role === 'moderator' ? 'a user' : 'a moderator'}!`);
        }
    };

    // ========== GROUP FUNCTIONS ==========
    const handleGroupComment = (groupId: string, postId: number, text: string, attachment?: any, parentId?: number) => {
        if (!currentUser) return;
        
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
        
        setGroups(prev => prev.map(g => {
            if (g.id === groupId) {
                const updatedPosts = g.posts.map(p => {
                    if (p.id === postId) {
                        const updatedComments = [...(p.comments || []), newComment];
                        return { ...p, comments: updatedComments };
                    }
                    return p;
                });
                return { ...g, posts: updatedPosts };
            }
            return g;
        }));
    };

    const handleInviteToGroup = (groupId: string, userIds: number[]) => {
        if (!currentUser) return;
        
        setGroups(prev => prev.map(g => 
            g.id === groupId 
                ? { 
                    ...g, 
                    members: [...new Set([...g.members, ...userIds])] 
                } 
                : g
        ));
        
        alert(`Invited ${userIds.length} user(s) to the group!`);
    };

    const handleJoinGroup = (groupId: string) => { 
        if (!currentUser) return; 
        setGroups(prev => prev.map(g => 
            (g.id === groupId && !g.members.includes(currentUser.id)) 
                ? { 
                    ...g, 
                    members: [...g.members, currentUser.id] 
                } 
                : g
        )); 
    };
    
    const handleLeaveGroup = (groupId: string) => { 
        if (!currentUser) return; 
        setGroups(prev => prev.map(g => 
            (g.id === groupId) 
                ? { ...g, members: g.members.filter(id => id !== currentUser!.id) } 
                : g
        )); 
    };
    
    const handleDeleteGroup = (groupId: string) => { 
        if (!currentUser) return; 
        const group = groups.find(g => g.id === groupId); 
        if (group && (group.adminId === currentUser.id || isAdmin)) { 
            if (window.confirm("Are you sure you want to permanently delete this group?")) { 
                setGroups(prev => prev.filter(g => g.id !== groupId)); 
                alert("Group deleted successfully!");
            } 
        } else {
            alert("You don't have permission to delete this group.");
        }
    };
    
    const handleUpdateGroupImage = (groupId: string, type: 'cover' | 'profile', file: File) => { 
        const url = URL.createObjectURL(file); 
        setGroups(prev => prev.map(g => 
            g.id === groupId 
                ? (type === 'cover' 
                    ? { ...g, coverImage: url } 
                    : { ...g, image: url }) 
                : g
        )); 
    };
    
    const handlePostToGroup = (groupId: string, content: string, files: File[] | null, type: any, background?: string) => { 
        if (!currentUser) return;
        
        let images: string[] = [];
        let video: string | undefined = undefined;
        
        if (files && files.length > 0) {
            if (type === 'video' && files.length === 1) {
                video = URL.createObjectURL(files[0]);
            } else if (type === 'image' || type === 'multimage') {
                images = files.map(file => URL.createObjectURL(file));
            }
        }
        
        const timestamp = Date.now();
        const formattedTime = formatRelativeTime(timestamp);
        
        const newGroupPost: GroupPost = { 
            id: timestamp,
            authorId: currentUser.id, 
            content, 
            images: images.length > 0 ? images : undefined,
            video: video,
            timestamp: timestamp, 
            formattedTime: formattedTime,
            reactions: [], 
            comments: [], 
            shares: 0,
            background: background
        }; 
        
        setGroups(prev => prev.map(g => 
            g.id === groupId 
                ? { ...g, posts: [newGroupPost, ...g.posts] } 
                : g
        )); 
        
        const newFeedPost: PostType = { 
            id: timestamp,
            authorId: currentUser.id, 
            content,
            images: images.length > 0 ? images : undefined,
            video: video,
            timestamp: timestamp,
            formattedTime: formattedTime,
            createdAt: timestamp,
            reactions: [], 
            comments: [], 
            shares: 0,
            views: 0,
            type: type === 'multimage' ? 'image' : (type === 'video' ? 'video' : (images.length > 0 ? 'image' : 'text')),
            visibility: 'Public' as const,
            groupId, 
            groupName: groups.find(g => g.id === groupId)?.name,
            background
        }; 
        
        setPosts(prev => [newFeedPost, ...prev]); 
        
        alert("Post published to group successfully!");
    };
    
    const handleCreateGroupEvent = (groupId: string, eventData: Partial<Event>) => {
        if (!currentUser) return;
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
        
        setGroups(prev => prev.map(g => 
            g.id === groupId 
                ? { ...g, events: [...(g.events || []), newEvent] } 
                : g
        ));
        
        setEvents(prev => [newEvent, ...prev]);
        
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
    };
    
    const handleGroupShare = (groupId: string, postId: number, targetType: 'profile' | 'group' | 'brand', targetId?: string | number, extraCaption?: string) => {
        if (!currentUser) return;
        
        const group = groups.find(g => g.id === groupId);
        if (!group) return;
        
        const groupPost = group.posts.find(p => p.id === postId);
        if (!groupPost) return;
        
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
        
        setPosts(prev => [newSharedPost, ...prev]);
        
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
        
        setActiveGroupShare(null);
        alert("Shared successfully from group!");
    };
    
    const handleCreateGroup = (groupData: Partial<Group>) => {
        if (!currentUser) return;
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
        
        alert("Group created successfully!");
    };
    
    const handleReactGroupPost = (groupId: string, postId: number, type: ReactionType) => { 
        if (!currentUser) return; 
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
                        }
                        return { ...p, reactions: newReactions };
                    }
                    return p;
                });
                return { ...g, posts: updatedPosts };
            }
            return g;
        }));
    };
    
    const handleOpenGroupComments = (groupId: string, postId: number) => {
        setActiveGroupComments({ groupId, postId });
    };
    
    const handleShareGroupPost = (groupId: string, postId: number) => {
        setActiveGroupShare({ groupId, postId });
    };
    
    const handleUpdateGroupSettings = (groupId: string, settings: Partial<Group>) => { 
        setGroups(prev => prev.map(g => 
            g.id === groupId ? { ...g, ...settings } : g
        )); 
    };
    
    const handleRemoveMember = (groupId: string, memberId: number) => { 
        const group = groups.find(g => g.id === groupId); 
        if (currentUser && group && (group.adminId === currentUser.id || isAdmin)) { 
            setGroups(prev => prev.map(g => 
                g.id === groupId 
                    ? { ...g, members: g.members.filter(id => id !== memberId) } 
                    : g
            )); 
        } 
    };
    
    const handleDeleteGroupPost = (groupId: string, postId: number) => { 
        const group = groups.find(g => g.id === groupId); 
        const post = group?.posts.find(p => p.id === postId); 
        if (currentUser && group && post && (group.adminId === currentUser.id || isAdmin || post.authorId === currentUser.id)) { 
            if (window.confirm("Are you sure you want to delete this group post?")) {
                setGroups(prev => prev.map(g => 
                    (g.id === groupId) 
                        ? { ...g, posts: g.posts.filter(p => p.id !== postId) } 
                        : g
                )); 
                
                setPosts(prev => prev.filter(p => !(p.id === postId && p.groupId === groupId)));
                
                alert("Group post deleted successfully!");
            }
        } else {
            alert("You don't have permission to delete this post.");
        }
    };

    const handleLikeStory = (storyId: number) => {
        if (!currentUser) { alert("Please login to like stories."); return; }
        setStories(prev => prev.map(s => {
            if (s.id === storyId) {
                const reactions = s.reactions || [];
                const existingLike = reactions.find(r => r.userId === currentUser!.id);
                if (existingLike) {
                    return { ...s, reactions: reactions.filter(r => r.userId !== currentUser!.id) };
                } else {
                    return { ...s, reactions: [...reactions, { userId: currentUser!.id }] };
                }
            }
            return s;
        }));
    };
    
    const handleReplyStory = (storyId: number, text: string) => {
        if (!currentUser) { alert("Please login to reply."); return; }
        setStories(prev => prev.map(s => {
            if (s.id === storyId) {
                const replies = s.replies || [];
                const newReply = { userId: currentUser!.id, text, timestamp: Date.now() };
                return { ...s, replies: [...replies, newReply] };
            }
            return s;
        }));
    };

    const handleReelReact = (reelId: number, type: ReactionType | undefined) => {
        if (!currentUser) return alert("Please login to react.");
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
                }
                return { ...reel, reactions: newReactions };
            }
            return reel;
        }));
    };

    const effectiveView = view;

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
