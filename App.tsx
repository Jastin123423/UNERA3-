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

// ========== MAIN APP COMPONENT ==========
export default function App({ initialData, initialPath }: { initialData?: any, initialPath?: string }) {
    const { t } = useLanguage();

    const [isClient, setIsClient] = useState(false);
    
    // ========== CRITICAL FIX: Initialize all states properly ==========
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
    
    // People You May Know state
    const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
    
    // Groups You May Like state
    const [suggestedGroups, setSuggestedGroups] = useState<Group[]>([]);
    
    // State to track which rotation set we're on
    const [suggestionRotation, setSuggestionRotation] = useState<number>(0);
    const [groupRotation, setGroupRotation] = useState<number>(0);
    const [brandRotation, setBrandRotation] = useState<number>(0);
    
    // ========== CRITICAL FIX: Initialize auth states properly ==========
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [showRegister, setShowRegister] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [loginError, setLoginError] = useState('');
    
    // ========== CRITICAL FIX: Initialize messaging states ==========
    const [messages, setMessages] = useState<Message[]>([]);
    const [unreadMessageCounts, setUnreadMessageCounts] = useState<Record<number, number>>({});
    const [recentConversations, setRecentConversations] = useState<any[]>([]);
    const [userStatus, setUserStatus] = useState<Record<number, { isOnline: boolean; lastSeen: string; typing: boolean }>>({});
    
    // ========== CRITICAL FIX: Initialize app state ==========
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        setIsClient(true);
    }, []);
    
    const serverPath = initialPath || '/';
    const clientPath = isClient ? getPath() : serverPath;
    const path = clientPath;
    
    // Update parsedPath to include users dependency
    const parsedPath = useMemo(() => parsePath(path, users), [path, users]);
    
    // ========== CRITICAL FIX: Initialize view state properly ==========
    const [view, setView] = useState<'home' | 'login' | 'profile' | 'marketplace' | 'reels' | 'groups' | 'brands' | 'events' | 'birthdays' | 'suggested_profiles' | 'memories' | 'music' | 'tools' | 'help_support' | 'settings' | 'privacy_policy' | 'terms_of_service' | 'single_post'>('home');
    
    const [activeTab, setActiveTab] = useState('home');
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
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
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [activeProduct, setActiveProduct] = useState<Product | null>(null);
    const [activeSinglePostId, setActiveSinglePostId] = useState<number | null>(null);

    const isAdmin = currentUser?.role === 'admin';

    const storiesWithUsers = useMemo(() => {
        return stories.map(story => {
            const user = users.find(u => u.id === story.userId);
            return { ...story, user };
        }).sort((a,b) => b.createdAt - a.createdAt);
    }, [stories, users]);

    // ========== CRITICAL FIX: Load initial data ==========
    useEffect(() => {
        if (isClient) {
            console.log('[DEBUG] Loading initial data...');
            
            // Load initial data from localStorage or use defaults
            const loadInitialData = async () => {
                try {
                    // Check for stored user
                    const storedUser = localStorage.getItem('universeCurrentUser');
                    if (storedUser) {
                        const user = JSON.parse(storedUser);
                        setCurrentUser(user);
                        console.log('[DEBUG] Loaded user from storage:', user.name);
                    }
                    
                    // Load other data from localStorage if available
                    const storedPosts = localStorage.getItem('universePosts');
                    if (storedPosts) {
                        const parsedPosts = JSON.parse(storedPosts);
                        const postsWithFormattedTime = parsedPosts.map((post: PostType) => ({
                            ...post,
                            formattedTime: post.formattedTime || formatRelativeTime(post.timestamp || post.createdAt || Date.now())
                        }));
                        setPosts(postsWithFormattedTime);
                    }
                    
                    // Load users
                    const storedUsers = localStorage.getItem('universeUsers');
                    if (storedUsers) {
                        setUsers(JSON.parse(storedUsers));
                    }
                    
                    // Load other data...
                    const storedStories = localStorage.getItem('universeStories');
                    if (storedStories) setStories(JSON.parse(storedStories));
                    
                    const storedProducts = localStorage.getItem('marketplaceProducts');
                    if (storedProducts) setProducts(JSON.parse(storedProducts));
                    
                    const storedSongs = localStorage.getItem('universeSongs');
                    if (storedSongs) setSongs(JSON.parse(storedSongs));
                    
                    const storedEpisodes = localStorage.getItem('universeEpisodes');
                    if (storedEpisodes) setEpisodes(JSON.parse(storedEpisodes));
                    
                    const storedBrands = localStorage.getItem('universeBrands');
                    if (storedBrands) setBrands(JSON.parse(storedBrands));
                    
                    const storedGroups = localStorage.getItem('universeGroups');
                    if (storedGroups) setGroups(JSON.parse(storedGroups));
                    
                    const storedNotifications = localStorage.getItem('universeNotifications');
                    if (storedNotifications) setNotifications(JSON.parse(storedNotifications));
                    
                    const storedMessages = localStorage.getItem('universeMessages');
                    if (storedMessages) setMessages(JSON.parse(storedMessages));
                    
                } catch (error) {
                    console.error('[DEBUG] Error loading initial data:', error);
                } finally {
                    // Set loading to false after a short delay
                    setTimeout(() => {
                        setIsLoading(false);
                        console.log('[DEBUG] Loading complete');
                    }, 500);
                }
            };
            
            loadInitialData();
        }
    }, [isClient]);

    // ========== CRITICAL FIX: Initialize view after data loads ==========
    useEffect(() => {
        if (!isLoading && isClient) {
            console.log('[DEBUG] Initializing view:', { 
                path, 
                parsedPath: parsedPath.view, 
                hasUser: !!currentUser,
                view
            });
            
            // Check URL path to determine initial view
            if (path === '/login' || path === '/register') {
                if (!currentUser) {
                    setView('login');
                    setActiveTab('home');
                } else {
                    // User is logged in but on login page, redirect to home
                    window.history.replaceState({}, '', '/');
                    setView('home');
                    setActiveTab('home');
                }
            } else if (parsedPath.view === 'profile' && parsedPath.userId) {
                if (!currentUser) {
                    // Guest trying to view profile, show login
                    setView('login');
                    sessionStorage.setItem('unauth_redirect', 'profile');
                } else {
                    setSelectedUserId(parsedPath.userId);
                    setView('profile');
                    setActiveTab('profile');
                }
            } else if (parsedPath.view === 'home' || path === '/') {
                // Always show home for root path
                setView('home');
                setActiveTab('home');
            } else {
                // For other routes, check if they require auth
                const protectedRoutes = [
                    'profile', 'create_event', 'create_post', 'create_story', 
                    'create_reel', 'marketplace_create', 'messages', 'settings',
                    'groups', 'suggested_profiles', 'profiles', 'memories'
                ];
                
                if (protectedRoutes.includes(parsedPath.view) && !currentUser) {
                    // Guest trying to access protected route, show login
                    setView('login');
                    sessionStorage.setItem('unauth_redirect', parsedPath.view);
                } else {
                    setView(parsedPath.view as any);
                    setActiveTab(parsedPath.view);
                }
            }
        }
    }, [isLoading, isClient, path, parsedPath, currentUser]);

    // Enhanced ranked posts with brand boost using the unified rankFeed function
    const rankedPosts = useMemo(() => {
        if (isLoading) return [];
        
        // Ensure all posts have formattedTime
        const processedPosts = posts.map(post => ({
            ...post,
            formattedTime: post.formattedTime || formatRelativeTime(post.timestamp || post.createdAt || Date.now())
        }));
        
        // Create product posts with proper product data
        const productPosts: PostType[] = products.map(p => ({ 
            id: p.id + 100000, 
            authorId: p.sellerId, 
            content: `Just listed a new item: ${p.title}`, 
            timestamp: p.date,
            formattedTime: formatRelativeTime(p.date),
            createdAt: p.date, 
            reactions: p.ratings?.map(r => ({ userId: r.userId, type: 'like' as ReactionType })) || [], 
            comments: p.comments?.map(c => ({
                id: Date.now() + Math.random(),
                userId: c.userId,
                text: c.text,
                timestamp: c.timestamp,
                formattedTime: formatRelativeTime(c.timestamp),
                likes: 0,
                authorName: c.authorName,
                authorImage: c.authorImage
            })) || [],
            shares: 0, 
            views: p.views, 
            type: 'product' as const, 
            visibility: 'Public' as const, 
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
            type: 'video' as const, 
            visibility: 'Public' as const
        }));
        
        // Combine all posts including brand posts
        const allContent = [...processedPosts, ...productPosts, ...reelPosts];
        
        // Use the unified rankFeed function that now accepts brands
        return rankFeed(allContent, currentUser, users, brands);
    }, [posts, reels, products, currentUser, users, brands, isLoading]);

    // ========== FIXED: Navigation handler ==========
    const handleNavigate = (targetView: string) => {
        console.log('[DEBUG] handleNavigate called:', { 
            targetView, 
            currentView: view, 
            hasUser: !!currentUser,
            isLoginView: targetView === 'login' || targetView === 'register'
        });
        
        // ========== CRITICAL FIX: Special handling for login/register ==========
        if (targetView === 'login' || targetView === 'register') {
            console.log('[DEBUG] Direct navigation to auth page');
            setView(targetView as any);
            setActiveTab('home');
            
            // Don't check for auth requirements on login/register pages
            if (isClient) {
                const path = targetView === 'login' ? '/login' : '/register';
                window.history.pushState({}, '', path);
            }
            return;
        }
        
        // ========== FIXED: Check if login is required for this view ==========
        const requiresLogin = [
            'profile', 'create_event', 'create_post', 'create_story', 
            'create_reel', 'marketplace_create', 'messages', 'settings',
            'groups', 'suggested_profiles', 'profiles', 'memories'
        ].includes(targetView);
        
        if (requiresLogin && !currentUser) {
            console.log('[DEBUG] Login required for', targetView, 'redirecting to login');
            
            // Store the intended destination for after login
            if (isClient) {
                sessionStorage.setItem('unauth_redirect', targetView);
            }
            
            // Set view to login without immediately redirecting
            setView('login');
            
            // Update URL to login page
            if (isClient) {
                window.history.pushState({}, '', '/login');
            }
            return;
        }
        
        // ========== Handle regular navigation for authenticated users ==========
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
                setView(targetView as any);
                setActiveTab('home');
        }
    };
    
    // ========== FIXED: Enhanced login handler with redirect support ==========
    const handleLogin = (email: string, pass: string) => {
        const user = users.find(u => u.email === email && u.password === pass);
        if (user) {
            setCurrentUser(user);
            setLoginError('');
            setShowRegister(false);
            setShowForgotPassword(false);
            
            // Save to localStorage
            if (isClient) {
                localStorage.setItem('universeCurrentUser', JSON.stringify(user));
            }
            
            // Check if there's a stored redirect URL
            if (isClient) {
                const redirectTo = sessionStorage.getItem('unauth_redirect');
                
                if (redirectTo) {
                    console.log('[DEBUG] Redirecting to stored target after login:', redirectTo);
                    sessionStorage.removeItem('unauth_redirect');
                    handleNavigate(redirectTo);
                } else {
                    // Default to home
                    setView('home');
                    setActiveTab('home');
                    window.history.pushState({}, '', '/');
                }
            } else {
                setView('home');
                setActiveTab('home');
            }
        } else {
            setLoginError('Invalid email or password');
        }
    };

    // ========== FIXED: Enhanced register handler with redirect support ==========
    const handleRegister = (newUser: Partial<User>) => {
        const id = Math.max(...users.map(u => u.id)) + 1;
        const user: User = { 
            ...newUser, 
            id, 
            role: 'user', 
            followers: [], 
            following: [], 
            joinedDate: new Date().toISOString() 
        } as User;
        
        setUsers([...users, user]);
        setCurrentUser(user);
        setShowRegister(false);
        setShowForgotPassword(false);
        
        // Save to localStorage
        if (isClient) {
            localStorage.setItem('universeCurrentUser', JSON.stringify(user));
            localStorage.setItem('universeUsers', JSON.stringify([...users, user]));
        }
        
        // Check for redirect after registration
        if (isClient) {
            const redirectTo = sessionStorage.getItem('unauth_redirect');
            
            if (redirectTo) {
                console.log('[DEBUG] Redirecting after registration:', redirectTo);
                sessionStorage.removeItem('unauth_redirect');
                handleNavigate(redirectTo);
            } else {
                // Default to home
                setView('home');
                window.history.pushState({}, '', '/');
            }
        } else {
            setView('home');
        }
    };

    // ========== FIXED: Logout handler with cleanup ==========
    const handleLogout = () => {
        setCurrentUser(null);
        if (isClient) {
            localStorage.removeItem('universeCurrentUser');
            // Clear any stored redirects
            sessionStorage.removeItem('unauth_redirect');
            window.history.pushState({}, '', '/');
        }
        // Keep guests on home page to see content
        setView('home');
        setActiveTab('home');
        setCurrentAudioTrack(null);
        setIsAudioPlaying(false);
    };

    // ========== FIXED: Auth navigation helper for profile clicks ==========
    const handleAuthNavigation = (targetView: string, requireAuth: boolean = false) => {
        console.log('[DEBUG] Auth Navigation:', { 
            targetView, 
            requireAuth, 
            currentUser: !!currentUser,
            currentView: view 
        });
        
        // If this view requires authentication and user is not logged in
        if (requireAuth && !currentUser) {
            console.log('[DEBUG] Authentication required, redirecting to login');
            
            // Store the intended target view for after login
            if (isClient && targetView !== 'login' && targetView !== 'register') {
                sessionStorage.setItem('unauth_redirect', targetView);
            }
            
            // Set view to login without immediately redirecting
            setView('login');
            
            // Update URL for login page
            if (isClient) {
                window.history.pushState({}, '', '/login');
            }
            
            return;
        }
        
        // If user is already on login/register and clicks login/register again, stay there
        if ((targetView === 'login' || targetView === 'register') && 
            (view === 'login' || view === 'register')) {
            console.log('[DEBUG] Already on auth page, staying');
            return;
        }
        
        // Handle regular navigation for authenticated users
        handleNavigate(targetView);
    };

    // ========== FIXED: Browser navigation handling ==========
    useEffect(() => {
        if (!isClient) return;
        
        const handlePopState = () => {
            const newPath = getPath();
            const parsed = parsePath(newPath, users);
            
            console.log('[DEBUG] Popstate detected:', { newPath, parsed, currentUser: !!currentUser });
            
            // Don't automatically redirect if on login/register pages
            if (newPath === '/login' || newPath === '/register') {
                if (currentUser) {
                    // User is logged in but navigated to login page, redirect to home
                    window.history.replaceState({}, '', '/');
                    setView('home');
                    setActiveTab('home');
                } else {
                    // Guest stays on login page
                    setView('login');
                }
                return;
            }
            
            // Handle other routes normally
            if (parsed.view === 'home' || newPath === '/') {
                setView('home');
                setActiveTab('home');
            } else if (parsed.view === 'profile' && parsed.userId) {
                if (!currentUser) {
                    // Guest trying to view profile, redirect to login
                    setView('login');
                    if (isClient) {
                        sessionStorage.setItem('unauth_redirect', 'profile');
                        window.history.replaceState({}, '', '/login');
                    }
                } else {
                    setSelectedUserId(parsed.userId);
                    setView('profile');
                    setActiveTab('profile');
                }
            } else {
                // Check if this route requires auth
                const protectedRoutes = [
                    'profile', 'create_event', 'create_post', 'create_story', 
                    'create_reel', 'marketplace_create', 'messages', 'settings',
                    'groups', 'suggested_profiles', 'profiles', 'memories'
                ];
                
                if (protectedRoutes.includes(parsed.view) && !currentUser) {
                    // Guest trying to access protected route, redirect to login
                    setView('login');
                    if (isClient) {
                        sessionStorage.setItem('unauth_redirect', parsed.view);
                        window.history.replaceState({}, '', '/login');
                    }
                } else {
                    setView(parsed.view as any);
                    setActiveTab(parsed.view);
                }
            }
        };
        
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [isClient, users, currentUser]);

    // ========== Basic interaction functions (simplified for now) ==========
    const handleFollowUser = (userIdToToggle: number) => {
        if (!currentUser) {
            setView('login');
            return;
        }
        // Basic follow logic
        console.log('Follow user:', userIdToToggle);
    };

    const handleReact = (itemId: number, type: ReactionType) => {
        if (!currentUser) {
            setView('login');
            return;
        }
        console.log('React to post:', itemId, type);
    };

    const handleComment = (itemId: number, text: string) => {
        if (!currentUser) {
            setView('login');
            return;
        }
        console.log('Comment on post:', itemId, text);
    };

    // ========== Function to render music/podcast posts ==========
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
                    handleAuthNavigation('profile', true);
                }}
                onLikeTrack={() => {}}
                onTrackComment={() => {}}
                onTrackShare={() => {}}
                isLiked={likedTracks.includes(song.id)}
                showLoginPrompt={() => setView('login')}
            />
        );
    };

    // ========== Function to render regular posts ==========
    const renderRegularPost = (post: PostType, author: any, isFollowing?: boolean) => {
        const isBrandAuthor = author?.type === 'brand';
        
        // Ensure post has formattedTime
        const postWithFormattedTime = {
            ...post,
            formattedTime: post.formattedTime || formatRelativeTime(post.timestamp || post.createdAt || Date.now())
        };
        
        return (
            <Post 
                key={post.id} 
                post={postWithFormattedTime}
                author={author as any} 
                currentUser={currentUser} 
                users={users} 
                onProfileClick={(id) => { 
                    handleAuthNavigation('profile', true);
                }} 
                onReact={handleReact} 
                onShare={(id) => setActiveSharePostId(id)} 
                onViewImage={(url) => setFullScreenImage(url)} 
                onOpenComments={(postId) => {
                    if (!currentUser) {
                        setView('login');
                    } else {
                        setActiveCommentsPostId(postId);
                    }
                }} 
                onVideoClick={(p) => { setActiveReelId(p.id - 200000); setView('reels'); }} 
                onViewProduct={(p) => setActiveProduct(p)} 
                onGroupClick={(groupId) => { 
                    setInitialGroupIdToView(groupId); 
                    handleAuthNavigation('groups', true);
                }} 
                onPlayAudioTrack={handlePlayTrack} 
                onFollow={isBrandAuthor ? () => {} : handleFollowUser} 
                isFollowing={isFollowing} 
                onHashtagClick={() => {}} 
                onDeletePost={() => {}} 
                isAdmin={isAdmin}
                showLoginPrompt={() => setView('login')}
            />
        );
    };
    
    // ========== Function to render the main feed ==========
    const renderMainFeed = () => {
        if (isLoading || rankedPosts.length === 0) {
            return (
                <div className="w-full pt-4 md:px-8 pb-10">
                    <div className="text-center py-10">
                        <div className="inline-block w-10 h-10 border-4 border-[#1877F2] border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-[#B0B3B8]">Loading posts...</p>
                    </div>
                </div>
            );
        }
        
        return (
            <div className="w-full pt-4 md:px-8 pb-10">
                {/* Feed posts - VISIBLE TO EVERYONE (logged-in and non-logged-in) */}
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
        );
    };
    
    // ========== CRITICAL FIX: Determine what to render ==========
    const showLoginScreen = view === 'login' && !currentUser;
    
    // ========== Render the app ==========
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#18191A] flex-col">
                <div className="w-20 h-20 border-4 border-[#1877F2] border-t-transparent rounded-full animate-spin mb-4"></div>
                <div className="text-[#1877F2] font-bold text-xl animate-pulse">Loading UNERA...</div>
            </div>
        );
    }
    
    return (
        <div className="bg-[#18191A] min-h-screen flex flex-col font-sans">
            {showLoginScreen ? (
                // Show login/register only if view is 'login' AND user is not logged in
                showRegister 
                    ? <Register onRegister={handleRegister} onBackToLogin={() => { setShowRegister(false); setShowForgotPassword(false); }} /> 
                    : showForgotPassword
                    ? <ForgotPassword onBackToLogin={() => { setShowForgotPassword(false); setShowRegister(false); }} />
                    : <Login onLogin={handleLogin} onNavigateToRegister={() => { setShowRegister(true); setShowForgotPassword(false); }} onNavigateToForgotPassword={() => { setShowForgotPassword(true); setShowRegister(false); }} onClose={() => { setView('home'); setCurrentUser(null); }} error={loginError} />
            ) : (
                // ========== MAIN APP LAYOUT - FOR BOTH GUESTS AND LOGGED-IN USERS ==========
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
                    
                    {/* Header - Shows for both guests and logged-in users */}
                    <Header 
                        onHomeClick={() => handleNavigate('home')} 
                        onProfileClick={(id) => { 
                            handleAuthNavigation('profile', true);
                        }} 
                        onReelsClick={() => handleNavigate('reels')} 
                        onMarketplaceClick={() => handleNavigate('marketplace')} 
                        onGroupsClick={() => handleAuthNavigation('groups', true)} 
                        currentUser={currentUser} 
                        notifications={notifications} 
                        users={users} 
                        onLogout={handleLogout} 
                        onLoginClick={() => {
                            console.log('[DEBUG] Login clicked from Header');
                            // IMPORTANT: Use handleNavigate for login to ensure proper flow
                            handleNavigate('login');
                        }} 
                        onMarkNotificationsRead={() => {}} 
                        onNotificationClick={() => {}}
                        activeTab={activeTab} 
                        onNavigate={handleNavigate} 
                        onMessageClick={(userId) => {
                            handleAuthNavigation('messages', true);
                        }}
                    />
                    
                    <div className="flex justify-center w-full max-w-[1920px] mx-auto relative flex-1">
                        {/* Sidebar - Hidden for guests on mobile, shown for logged-in */}
                        {currentUser && (
                            <div className="sticky top-14 h-[calc(100vh-56px)] z-20 hidden lg:block">
                                <Sidebar 
                                    currentUser={currentUser} 
                                    onProfileClick={(id) => { 
                                        handleAuthNavigation('profile', true);
                                    }} 
                                    onReelsClick={() => handleNavigate('reels')} 
                                    onMarketplaceClick={() => handleNavigate('marketplace')} 
                                    onGroupsClick={() => handleAuthNavigation('groups', true)} 
                                />
                            </div>
                        )}
                        
                        <div className="w-full lg:w-[740px] xl:w-[700px] min-h-screen">
                            {view === 'home' && renderMainFeed()}
                            
                            {/* Other views can be added here as needed */}
                            {view === 'profile' && selectedUserId !== null && (
                                <div className="w-full pt-4 md:px-8 pb-10">
                                    <div className="bg-[#242526] rounded-xl p-4">
                                        <h2 className="text-white text-xl font-bold">Profile Page</h2>
                                        <p className="text-[#B0B3B8]">User profile would be shown here</p>
                                    </div>
                                </div>
                            )}
                            
                            {view === 'suggested_profiles' && (
                                <div className="w-full pt-4 md:px-8 pb-10">
                                    <div className="bg-[#242526] rounded-xl p-4">
                                        <h2 className="text-white text-xl font-bold">Suggested Profiles</h2>
                                        <p className="text-[#B0B3B8]">Suggested profiles would be shown here</p>
                                    </div>
                                </div>
                            )}
                            
                            {/* Add other view cases as needed */}
                        </div>
                        
                        {/* Right Sidebar - Only for logged-in users */}
                        {currentUser && (
                            <div className="sticky top-14 h-[calc(100vh-56px)] z-20 hidden xl:block pl-4">
                                <RightSidebar 
                                    contacts={users.filter(u => u.id !== currentUser?.id).slice(0, 5)} 
                                    onProfileClick={(id) => { 
                                        handleAuthNavigation('profile', true);
                                    }} 
                                    onMessageClick={(userId) => {
                                        handleAuthNavigation('messages', true);
                                    }}
                                    getUserStatus={() => ({ isOnline: false, lastSeen: '', typing: false })}
                                />
                            </div>
                        )}
                    </div>
                    
                    {/* Basic loading for other components */}
                    {isLoading && (
                        <div className="fixed inset-0 bg-[#18191A] bg-opacity-90 flex items-center justify-center z-50">
                            <div className="text-center">
                                <div className="inline-block w-16 h-16 border-4 border-[#1877F2] border-t-transparent rounded-full animate-spin mb-4"></div>
                                <div className="text-[#1877F2] font-bold text-xl">Loading...</div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
