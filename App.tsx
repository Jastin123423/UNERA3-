import React, { useState, useEffect, useMemo } from 'react';
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
                downloads: song.stats?.downloads || 0,
                reelsUse: song.stats?.reelsUse || 0
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
                downloads: episode.stats?.downloads || 0,
                reelsUse: episode.stats?.reelsUse || 0
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
    const brand = brands.find(b => b.id === post.authorId);
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

export default function App({ initialData, initialPath }: { initialData?: any, initialPath?: string }) {
    const { t } = useLanguage();

    const [isClient, setIsClient] = useState(false);
    useEffect(() => {
        setIsClient(true);
    }, []);

    const [users, setUsers] = useState<User[]>(initialData?.users || INITIAL_USERS);
    const [posts, setPosts] = useState<PostType[]>(initialData?.posts || INITIAL_POSTS);
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
    
    const [currentAudioTrack, setCurrentAudioTrack] = useState<AudioTrack | null>(null);
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    const [likedTracks, setLikedTracks] = useState<string[]>([]);
    const [playHistory, setPlayHistory] = useState<{trackId: string, timestamp: number, duration: number}[]>([]);

    const [showCreatePostModal, setShowCreatePostModal] = useState(false);
    const [showCreateStoryModal, setShowCreateStoryModal] = useState(false);
    const [showCreateReelModal, setShowCreateReelModal] = useState(false);
    const [showCreateEventModal, setShowCreateEventModal] = useState(false);
    const [activeStory, setActiveStory] = useState<Story | null>(null);
    const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
    const [activeCommentsPostId, setActiveCommentsPostId] = useState<number | null>(null);
    const [activeSharePostId, setActiveSharePostId] = useState<number | null>(null);
    const [activeChatUser, setActiveChatUser] = useState<User | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeProduct, setActiveProduct] = useState<Product | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [activeSinglePostId, setActiveSinglePostId] = useState<number | null>(initialData?.activeSinglePostId || parsedPath.postId || null);

    const isAdmin = currentUser?.role === 'admin';

    const storiesWithUsers = useMemo(() => {
        return stories.map(story => {
            const user = users.find(u => u.id === story.userId);
            return { ...story, user };
        }).sort((a,b) => b.createdAt - a.createdAt);
    }, [stories, users]);

    // Enhanced ranked posts with brand boost using the unified rankFeed function
    const rankedPosts = useMemo(() => {
        const productPosts: PostType[] = products.map(p => ({ 
            id: p.id + 100000, 
            authorId: p.sellerId, 
            content: `Just listed a new item: ${p.title}`, 
            timestamp: 'Just now', 
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
            timestamp: 'Recently', 
            createdAt: reel.createdAt, 
            reactions: reel.reactions, 
            comments: reel.comments, 
            shares: reel.shares, 
            views: (reel.reactions.length * 10) + (reel.shares * 5) + (reel.comments.length * 3), 
            type: 'video', 
            visibility: 'Public' 
        }));
        
        // Combine all posts including brand posts
        const allContent = [...posts, ...productPosts, ...reelPosts];
        
        // Use the unified rankFeed function that now accepts brands
        return rankFeed(allContent, currentUser, users, brands);
    }, [posts, reels, products, currentUser, users, brands]);

    // Load data from localStorage
    useEffect(() => {
        if (isClient) {
            const storedUser = localStorage.getItem('universeCurrentUser');
            const storedUsers = localStorage.getItem('universeUsers');
            const storedSongs = localStorage.getItem('universeSongs');
            const storedEpisodes = localStorage.getItem('universeEpisodes');
            const storedLikedTracks = localStorage.getItem('universeLikedTracks');
            const storedProducts = localStorage.getItem('marketplaceProducts');
            const storedBrands = localStorage.getItem('universeBrands');
            const storedPosts = localStorage.getItem('universePosts');
            
            if (storedUsers) setUsers(JSON.parse(storedUsers));
            if (storedSongs) setSongs(JSON.parse(storedSongs));
            if (storedEpisodes) setEpisodes(JSON.parse(storedEpisodes));
            if (storedLikedTracks) setLikedTracks(JSON.parse(storedLikedTracks));
            if (storedProducts) setProducts(JSON.parse(storedProducts));
            if (storedBrands) setBrands(JSON.parse(storedBrands));
            if (storedPosts) setPosts(JSON.parse(storedPosts));
            
            if (storedUser) {
                const user = JSON.parse(storedUser);
                const freshUser = (storedUsers ? JSON.parse(storedUsers) : INITIAL_USERS).find((u: User) => u.id === user.id);
                if (freshUser) setCurrentUser(freshUser);
            }
        }
        setTimeout(() => setIsLoading(false), 800);
    }, [isClient]);

    // Save data to localStorage
    useEffect(() => {
        if (isClient && currentUser) {
            localStorage.setItem('universeCurrentUser', JSON.stringify(currentUser));
        }
    }, [currentUser, isClient]);

    useEffect(() => {
        if (isClient) {
            localStorage.setItem('universeUsers', JSON.stringify(users));
        }
    }, [users, isClient]);

    useEffect(() => {
        if (isClient) {
            localStorage.setItem('universeSongs', JSON.stringify(songs));
        }
    }, [songs, isClient]);

    useEffect(() => {
        if (isClient) {
            localStorage.setItem('universeEpisodes', JSON.stringify(episodes));
        }
    }, [episodes, isClient]);

    useEffect(() => {
        if (isClient) {
            localStorage.setItem('universeLikedTracks', JSON.stringify(likedTracks));
        }
    }, [likedTracks, isClient]);

    useEffect(() => {
        if (isClient) {
            localStorage.setItem('marketplaceProducts', JSON.stringify(products));
        }
    }, [products, isClient]);

    useEffect(() => {
        if (isClient) {
            localStorage.setItem('universeBrands', JSON.stringify(brands));
        }
    }, [brands, isClient]);

    useEffect(() => {
        if (isClient) {
            localStorage.setItem('universePosts', JSON.stringify(posts));
        }
    }, [posts, isClient]);

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
            default:
                setView(targetView);
                setActiveTab('home');
        }
    };
    
    const handleFollowUser = (userIdToToggle: number) => {
        if (!currentUser) {
            alert("Please login to follow users.");
            return;
        }
        const currentUserId = currentUser.id;
    
        const isCurrentlyFollowing = currentUser.following.includes(userIdToToggle);
    
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

    const handleCreatePost = (text: string, file: File | null, type: any, visibility: any, location?: string, feeling?: string, taggedUsers?: number[], background?: string, linkPreview?: LinkPreview) => {
        if (!currentUser) return;
        const newPost: PostType = { 
            id: Date.now(), 
            authorId: currentUser.id, 
            content: text, 
            image: file && type === 'image' ? URL.createObjectURL(file) : undefined, 
            video: file && type === 'video' ? URL.createObjectURL(file) : undefined, 
            timestamp: 'Just now', 
            createdAt: Date.now(), 
            reactions: [], 
            comments: [], 
            shares: 0, 
            views: 0, 
            type, 
            visibility, 
            location, 
            feeling, 
            taggedUsers, 
            background, 
            linkPreview 
        };
        setPosts([newPost, ...posts]);
        if (taggedUsers && taggedUsers.length > 0) {
            const newNotifications: Notification[] = taggedUsers.map(userId => ({ id: Date.now() + userId, userId: userId, senderId: currentUser.id, type: 'mention', content: 'mentioned you in a post.', postId: newPost.id, timestamp: Date.now(), read: false, }));
            setNotifications(prev => [...newNotifications, ...prev]);
        }
    };

    // ========== BRAND MANAGEMENT FUNCTIONS ==========
    const handleCreateBrand = (brandData: Partial<Brand>) => {
        if (!currentUser) {
            alert("Please login to create a brand page.");
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
            followers: [currentUser.id], // AUTO-FOLLOW: Creator automatically follows the brand
            isVerified: false,
            posts: [],
            createdAt: Date.now(),
            profileImage: brandData.profileImage || `https://ui-avatars.com/api/?name=${brandData.name || 'Brand'}&background=random&size=150`,
            coverImage: brandData.coverImage || 'https://images.unsplash.com/photo-1557683316-973673baf926?ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80'
        };
        
        console.log("Creating new brand with auto-follow:", newBrand);
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
    };

    const handleUpdateBrand = (brandId: number, data: Partial<Brand>) => {
        setBrands(prev => prev.map(brand => 
            brand.id === brandId ? { ...brand, ...data } : brand
        ));
    };

    // ADMIN: Update brand cover/profile image
    const handleUpdateBrandImage = (brandId: number, type: 'cover' | 'profile', file: File) => {
        if (!isAdmin && !brands.find(b => b.id === brandId && b.adminId === currentUser?.id)) {
            alert("Only admins or brand owners can update images");
            return;
        }
        
        const url = URL.createObjectURL(file);
        setBrands(prev => prev.map(brand => 
            brand.id === brandId 
                ? (type === 'cover' 
                    ? { ...brand, coverImage: url }
                    : { ...brand, profileImage: url })
                : brand
        ));
    };

    const handlePostAsBrand = (brandId: number, content: any) => {
        console.log("Creating post as brand:", { brandId, content });
        
        const newPost: PostType = { 
            id: Date.now(), 
            authorId: brandId,  // CRITICAL: This must be the brand ID, not user ID
            content: content.text || content.content || '', 
            image: content.file && content.type === 'image' ? URL.createObjectURL(content.file) : undefined, 
            video: content.file && content.type === 'video' ? URL.createObjectURL(content.file) : undefined, 
            timestamp: 'Just now', 
            createdAt: Date.now(), 
            reactions: [], 
            comments: [], 
            shares: 0, 
            views: 0, 
            type: content.type || 'text', 
            visibility: content.visibility || 'Public', 
            location: content.location,
            feeling: content.feeling,
            taggedUsers: content.taggedUsers,
            background: content.background, 
            linkPreview: content.linkPreview 
        };
        
        console.log("New brand post created:", newPost);
        setPosts(prev => [newPost, ...prev]);
    };

    const handleFollowBrand = (brandId: number) => {
        if (!currentUser) return alert("Login to follow brands.");
        
        setBrands(prev => prev.map(b => {
            if (b.id === brandId) {
                const isFollowing = b.followers.includes(currentUser!.id);
                const updatedFollowers = isFollowing 
                    ? b.followers.filter(id => id !== currentUser!.id) 
                    : [...b.followers, currentUser!.id];
                
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
    };

    const handleDeleteBrand = (brandId: number) => {
        if(isAdmin && window.confirm("Delete this brand page permanently?")) { 
            setBrands(prev => prev.filter(b => b.id !== brandId));
            // Also delete posts from this brand
            setPosts(prev => prev.filter(p => p.authorId !== brandId));
            setView('brands'); 
        }
    };

    // ADMIN: Verify brand
    const handleVerifyBrand = (brandId: number) => {
        if (!isAdmin) return;
        setBrands(prev => prev.map(b => 
            b.id === brandId ? { ...b, isVerified: !b.isVerified } : b
        ));
    };

    // ADMIN: Delete post
    const handleDeletePost = (postId: number) => {
        if (!currentUser || !isAdmin) {
            alert("Only admins can delete posts");
            return;
        }
        
        if (window.confirm("Are you sure you want to delete this post?")) {
            setPosts(prev => prev.filter(p => p.id !== postId));
            alert("Post deleted successfully");
        }
    };
    // ========== END BRAND MANAGEMENT FUNCTIONS ==========

    const handleCreateProduct = (productData: Partial<Product>) => {
        console.log("Creating product with data:", productData);
        
        if (!currentUser) {
            alert("Please login to create a product listing.");
            return;
        }

        // Generate a shareId
        const generateShareId = () => {
            return 'prod_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        };

        // Create a complete product object
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
            shareId: generateShareId(),
        };

        console.log("New product created:", newProduct);
        
        // Update products state
        setProducts(prev => [...prev, newProduct]);
        
        alert("Product listed successfully!");
        
        return newProduct;
    };

    const handleCreateStory = (storyData: Partial<Story>) => {
        if (!currentUser) return;
        const newStory: Story = { id: Date.now(), userId: currentUser.id, user: currentUser, ...storyData, createdAt: Date.now() } as Story;
        setStories(prev => [newStory, ...prev]);
        setShowCreateStoryModal(false);
    };

    const handleCreateReel = (videoFile: File, caption: string, song?: Song | { name: string, url: string }, effectName?: string) => {
        if (!currentUser) return;
        const newReel: Reel = { id: Date.now(), userId: currentUser.id, videoUrl: URL.createObjectURL(videoFile), caption, songName: song ? (song as Song).title || (song as {name: string}).name : 'Original Audio', effectName: effectName, createdAt: Date.now(), reactions: [], comments: [], shares: 0, };
        setReels(prev => [newReel, ...prev]);
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

    const handleCreateEvent = (eventData: Partial<Event>) => {
        if (!currentUser) return;
        const newEvent: Event = { ...eventData, id: Date.now(), attendees: [currentUser.id], interestedIds: [] } as Event;
        setEvents(prev => [newEvent, ...prev]);
        const eventPost: PostType = { id: Date.now() + 1, authorId: currentUser.id, content: `is hosting a new event: ${newEvent.title}`, timestamp: 'Just now', createdAt: Date.now(), reactions: [], comments: [], shares: 0, type: 'event', visibility: 'Public', event: newEvent, eventId: newEvent.id };
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

    const handleComment = (itemId: number, text: string, attachment?: any, parentId?: number) => {
        if (!currentUser) return;
        const newComment: Comment = { 
            id: Date.now(), 
            userId: currentUser.id, 
            text, 
            timestamp: 'Just now', 
            likes: 0, 
            attachment,
            authorName: currentUser.name,
            authorImage: currentUser.profileImage
        };
        
        setPosts(prev => prev.map(p => {
            if (p.id === itemId) {
                const updatedComments = [...p.comments, newComment];
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

        const mentionRegex = /@(\w+(?:\s\w+)?)/g;
        const mentions = [...text.matchAll(mentionRegex)];
        if (mentions.length > 0) {
            const mentionedUserIds = new Set<number>();
            mentions.forEach(match => {
                const userName = match[1];
                const user = users.find(u => u.name.toLowerCase() === userName.toLowerCase());
                if (user && user.id !== currentUser.id) {
                    mentionedUserIds.add(user.id);
                }
            });

            if (mentionedUserIds.size > 0) {
                const newNotifications: Notification[] = Array.from(mentionedUserIds).map(userId => ({ id: Date.now() + userId, userId: userId, senderId: currentUser.id, type: 'mention', content: 'mentioned you in a comment.', postId: itemId, timestamp: Date.now(), read: false, }));
                setNotifications(prev => [...newNotifications, ...prev]);
            }
        }
    };

    const handleShare = (postId: number, targetType: 'profile' | 'group' | 'brand', targetId?: string | number, extraCaption?: string) => {
        if (!currentUser) return;
        const sourcePost = rankedPosts.find(p => p.id === postId);
        if (!sourcePost) return;
        
        // Check if it's a music/podcast post and update share count
        if (sourcePost.type === 'music' || sourcePost.type === 'podcast') {
            if (sourcePost.audioTrack) {
                const song = getSongForPost(sourcePost, songs, episodes);
                if (song) {
                    handleTrackShare(song.id);
                }
            }
        }
        
        const newSharedPost: PostType = { 
            ...sourcePost, 
            id: Date.now(), 
            authorId: currentUser.id, 
            content: extraCaption ? `${extraCaption}\n\n${sourcePost.content || ''}` : sourcePost.content, 
            timestamp: 'Just now', 
            createdAt: Date.now(), 
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
        const newPost: PostType = { id: Date.now(), authorId: currentUser.id, content: data.content, timestamp: 'Just now', createdAt: Date.now(), reactions: [], comments: [], shares: 0, views: 0, type: data.type || 'text', visibility: 'Public', audioTrack: data.audioTrack };
        setPosts([newPost, ...posts]);
    };

    // Handle adding songs from upload - ENHANCED to ensure complete audioTrack data
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
            // Check if song already exists
            const exists = prev.find(s => s.id === song.id);
            if (exists) {
                // Update existing song
                return prev.map(s => s.id === song.id ? newSong : s);
            }
            // Add new song at the beginning
            return [newSong, ...prev];
        });
        
        // Also create a feed post for the new upload - ENSURE COMPLETE AUDIOTRACK DATA
        if (currentUser) {
            const audioTrack: AudioTrack = {
                id: song.id,
                title: song.title,
                artist: song.artist,
                duration: typeof song.duration === 'string' ? 
                    parseInt(song.duration.split(':')[0]) * 60 + parseInt(song.duration.split(':')[1]) || 180 : 
                    song.duration || 180,
                url: song.audioUrl || '',
                uploaderId: song.uploaderId || currentUser.id,
                cover: song.cover || '/default-cover.jpg', // ENSURE COVER EXISTS
                type: 'music',
                isVerified: true,
                plays: song.plays || 0,
                likes: song.likes || 0,
                shares: song.shares || 0
            };
            
            const newPost: PostType = {
                id: Date.now(),
                authorId: currentUser.id,
                content: `🎵 Just released new music: "${song.title}" by ${song.artist}`,
                timestamp: 'Just now',
                createdAt: Date.now(),
                reactions: [],
                comments: [],
                shares: 0,
                views: 0,
                type: 'music',
                visibility: 'Public',
                audioTrack: audioTrack
            };
            
            setPosts(prev => [newPost, ...prev]);
        }
    };

    // Handle adding episodes from upload - ENHANCED to ensure complete audioTrack data
    const handleAddEpisode = (episode: Episode) => {
        console.log("Adding new episode to library:", episode);
        const newEpisode = {
            ...episode,
            plays: episode.plays || 0,
            likes: episode.likes || 0,
            shares: episode.shares || 0,
            comments: episode.comments || 0,
            uploadDate: episode.uploadDate || new Date().toISOString(),
            stats: episode.stats || {
                plays: episode.plays || 0,
                likes: episode.likes || 0,
                shares: episode.shares || 0,
                comments: episode.comments || 0,
                downloads: 0,
                reelsUse: 0
            }
        };
        
        setEpisodes(prev => {
            const exists = prev.find(e => e.id === episode.id);
            if (exists) {
                return prev.map(e => e.id === episode.id ? newEpisode : e);
            }
            return [newEpisode, ...prev];
        });
        
        // Also create a feed post for the new upload - ENSURE COMPLETE AUDIOTRACK DATA
        if (currentUser) {
            const audioTrack: AudioTrack = {
                id: episode.id,
                title: episode.title,
                artist: episode.host || 'Podcast Host',
                duration: typeof episode.duration === 'string' ?
                    parseInt(episode.duration.split(':')[0]) * 60 + parseInt(episode.duration.split(':')[1]) || 1800 :
                    episode.duration || 1800,
                url: episode.audioUrl || '',
                uploaderId: episode.uploaderId || currentUser.id,
                cover: episode.thumbnail || episode.cover || '/default-cover.jpg', // ENSURE COVER EXISTS
                type: 'podcast',
                isVerified: true,
                plays: episode.plays || 0,
                likes: episode.likes || 0,
                shares: episode.shares || 0
            };
            
            const newPost: PostType = {
                id: Date.now(),
                authorId: currentUser.id,
                content: `🎙️ New podcast episode: "${episode.title}" with ${episode.host || 'Podcast Host'}`,
                timestamp: 'Just now',
                createdAt: Date.now(),
                reactions: [],
                comments: [],
                shares: 0,
                views: 0,
                type: 'podcast',
                visibility: 'Public',
                audioTrack: audioTrack
            };
            
            setPosts(prev => [newPost, ...prev]);
        }
    };

    // Handle upload to feed (kept for backward compatibility)
    const handleUploadToFeed = (song: Song) => {
        console.log("Uploading to feed (deprecated, using handleAddSong instead):", song);
        handleAddSong(song);
    };

    // Enhanced handlePlayTrack with proper play counting
    const handlePlayTrack = (track: AudioTrack) => { 
        setCurrentAudioTrack(track); 
        setIsAudioPlaying(true); 
        
        // Add to play history
        setPlayHistory(prev => [...prev, {
            trackId: track.id,
            timestamp: Date.now(),
            duration: track.duration
        }]);
        
        // Update play count for the track
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
    };

    // Handle like for music/podcast posts
    const handleLikeTrack = (trackId: string, isLiked: boolean) => {
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
    };

    // Handle comment count for music/podcast posts
    const handleTrackComment = (trackId: string) => {
        // Update song/episode comment count
        const track = songs.find(s => s.id === trackId) || episodes.find(e => e.id === trackId);
        if (track) {
            if ('artist' in track) {
                // It's a song
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
                // It's an episode
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
        }
    };

    // Handle share for music/podcast posts
    const handleTrackShare = (trackId: string) => {
        // Update song/episode share count
        const track = songs.find(s => s.id === trackId) || episodes.find(e => e.id === trackId);
        if (track) {
            if ('artist' in track) {
                // It's a song
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
                // It's an episode
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
        }
    };

    const handleVerifyUser = (userId: number) => { if (isAdmin) setUsers(users.map(u => u.id === userId ? { ...u, isVerified: !u.isVerified } : u)); };
    const handleRestrictUser = (userId: number) => { if (isAdmin) setUsers(users.map(u => u.id === userId ? { ...u, isRestricted: true, restrictedUntil: Date.now() + 24 * 60 * 60 * 1000 } : u)); };
    const handleDeleteUser = (userId: number) => { if (isAdmin && window.confirm("Delete this user and all their content? This is irreversible.")) { setUsers(users.filter(u => u.id !== userId)); setPosts(posts.filter(p => p.authorId !== userId)); setReels(reels.filter(r => r.userId !== userId)); setStories(stories.filter(s => s.userId !== userId)); } };
    const handleMakeModerator = (userId: number) => { if (isAdmin) setUsers(users.map(u => u.id === userId ? { ...u, role: u.role === 'moderator' ? 'user' : 'moderator' } : u)); };
    
    const handleCreateGroup = (groupData: Partial<Group>) => {
        if (!currentUser) return;
        const newGroup: Group = { ...groupData, id: `g${Date.now()}`, adminId: currentUser.id, members: [currentUser.id], posts: [], createdDate: Date.now() } as Group;
        setGroups(prev => [newGroup, ...prev]);
    };
    const handleJoinGroup = (groupId: string) => { if (!currentUser) return; setGroups(prev => prev.map(g => (g.id === groupId && !g.members.includes(currentUser.id)) ? { ...g, members: [...g.members, currentUser.id] } : g)); };
    const handleLeaveGroup = (groupId: string) => { if (!currentUser) return; setGroups(prev => prev.map(g => (g.id === groupId) ? { ...g, members: g.members.filter(id => id !== currentUser!.id) } : g)); };
    const handleDeleteGroup = (groupId: string) => { if (!currentUser) return; const group = groups.find(g => g.id === groupId); if (group && (group.adminId === currentUser.id || isAdmin)) { if (window.confirm("Are you sure you want to permanently delete this group?")) { setGroups(prev => prev.filter(g => g.id !== groupId)); } } };
    const handleUpdateGroupImage = (groupId: string, type: 'cover' | 'profile', file: File) => { const url = URL.createObjectURL(file); setGroups(prev => prev.map(g => g.id === groupId ? (type === 'cover' ? { ...g, coverImage: url } : { ...g, image: url }) : g)); };
    const handlePostToGroup = (groupId: string, content: string, file: File | null, type: any) => { if (!currentUser) return; const newPost: GroupPost = { id: Date.now(), authorId: currentUser.id, content, image: file && type === 'image' ? URL.createObjectURL(file) : undefined, video: file && type === 'video' ? URL.createObjectURL(file) : undefined, timestamp: Date.now(), reactions: [], comments: [], shares: 0 }; setGroups(prev => prev.map(g => g.id === groupId ? { ...g, posts: [newPost, ...g.posts] } : g)); const newFeedPost: PostType = { ...newPost, type, visibility: 'Public', timestamp: 'Just now', createdAt: newPost.timestamp, groupId, groupName: groups.find(g => g.id === groupId)?.name }; setPosts(prev => [newFeedPost, ...prev]); };
    const handleReactGroupPost = (groupId: string, postId: number, type: ReactionType) => { if (!currentUser) return; setGroups(prev => prev.map(g => { if (g.id === groupId) { const updatedPosts = g.posts.map(p => { if (p.id === postId) { const reactions = p.reactions; const existing = reactions.find(r => r.userId === currentUser.id); let newReactions = [...reactions]; if (existing) { if (existing.type === type) newReactions = newReactions.filter(r => r.userId !== currentUser!.id); else newReactions = newReactions.map(r => r.userId === currentUser!.id ? { ...r, type } : r); } else { newReactions.push({ userId: currentUser!.id, type }); } return { ...p, reactions: newReactions }; } return p; }); return { ...g, posts: updatedPosts }; } return g; })); };
    const handleUpdateGroupSettings = (groupId: string, settings: Partial<Group>) => { setGroups(prev => prev.map(g => g.id === groupId ? { ...g, ...settings } : g)); };
    const handleRemoveMember = (groupId: string, memberId: number) => { const group = groups.find(g => g.id === groupId); if (currentUser && group && (group.adminId === currentUser.id || isAdmin)) { setGroups(prev => prev.map(g => g.id === groupId ? { ...g, members: g.members.filter(id => id !== memberId) } : g)); } };
    const handleDeleteGroupPost = (groupId: string, postId: number) => { const group = groups.find(g => g.id === groupId); const post = group?.posts.find(p => p.id === postId); if (currentUser && group && post && (group.adminId === currentUser.id || isAdmin || post.authorId === currentUser.id)) { setGroups(prev => prev.map(g => (g.id === groupId) ? { ...g, posts: g.posts.filter(p => p.id !== postId) } : g)); } };

    const effectiveView = isClient ? view : (initialData?.view || parsedPath.view);
    
    // Function to render music/podcast posts (used in both homepage and profile)
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

    // Function to render regular posts
    const renderRegularPost = (post: PostType, author: any, isFollowing?: boolean) => {
        return (
            <Post 
                key={post.id} 
                post={post} 
                author={author as any} 
                currentUser={currentUser} 
                users={users} 
                onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} 
                onReact={handleReact} 
                onShare={(id) => setActiveSharePostId(id)} 
                onViewImage={(url) => setFullScreenImage(url)} 
                onOpenComments={(postId) => setActiveCommentsPostId(postId)} 
                onVideoClick={(p) => { setActiveReelId(p.id - 200000); setView('reels'); }} 
                onViewProduct={(p) => setActiveProduct(p)} 
                onGroupClick={(groupId) => { setInitialGroupIdToView(groupId); setView('groups'); setActiveTab('groups'); }} 
                onPlayAudioTrack={handlePlayTrack} 
                onFollow={handleFollowUser} 
                isFollowing={isFollowing} 
                onHashtagClick={handleTagClick} 
                onDeletePost={isAdmin ? handleDeletePost : undefined}
                isAdmin={isAdmin}
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
                        onMarkNotificationsRead={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))} 
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
                                        
                                        const isFollowing = currentUser && 'type' in author && author.type === 'user' 
                                            ? currentUser.following.includes(author.id)
                                            : false;
                                        
                                        // Handle music/podcast posts with MusicFeedPost component
                                        if ((post.type === 'music' || post.type === 'podcast') && post.audioTrack) {
                                            return renderMusicPost(post, author);
                                        }
                                        
                                        // Handle all other post types with regular Post component
                                        return renderRegularPost(post, author, isFollowing);
                                    })}
                                </div>
                            )}
                            
                            {effectiveView === 'profile' && selectedUserId !== null && (
                                <UserProfile 
                                    user={users.find(u => u.id === selectedUserId)!} 
                                    currentUser={currentUser} 
                                    users={users} 
                                    // CRITICAL FIX: Ensure music posts have complete audioTrack data for UserProfile
                                    posts={(() => {
                                        const userPosts = posts.filter(p => p.authorId === selectedUserId);
                                        
                                        // Enhance music/podcast posts with complete audioTrack data
                                        const enhancedPosts = userPosts.map(post => {
                                            if ((post.type === 'music' || post.type === 'podcast') && post.audioTrack) {
                                                // Find the song/episode to get complete data
                                                const song = songs.find(s => s.id === post.audioTrack?.id);
                                                const episode = episodes.find(e => e.id === post.audioTrack?.id);
                                                
                                                if (song || episode) {
                                                    return {
                                                        ...post,
                                                        audioTrack: {
                                                            ...post.audioTrack,
                                                            cover: song?.cover || episode?.thumbnail || post.audioTrack.cover || '/default-cover.jpg',
                                                            plays: song?.plays || episode?.plays || post.audioTrack.plays || 0,
                                                            likes: song?.likes || episode?.likes || post.audioTrack.likes || 0,
                                                            shares: song?.shares || episode?.shares || post.audioTrack.shares || 0,
                                                        }
                                                    };
                                                }
                                            }
                                            return post;
                                        });
                                        
                                        return [
                                            ...enhancedPosts,
                                            ...products
                                                .filter(p => p.sellerId === selectedUserId)
                                                .map(p => ({
                                                    id: p.id + 100000,
                                                    authorId: p.sellerId,
                                                    content: `Just listed a new item: ${p.title}`,
                                                    timestamp: 'Just now',
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
                                        // Handle deleting both regular posts and product posts
                                        if (id > 100000) {
                                            // This is a product post (ID > 100000)
                                            const productId = id - 100000;
                                            setProducts(prev => prev.filter(p => p.id !== productId));
                                        } else {
                                            // This is a regular post - check if it's a music/podcast post
                                            const postToDelete = posts.find(p => p.id === id);
                                            if (postToDelete && (postToDelete.type === 'music' || postToDelete.type === 'podcast') && postToDelete.audioTrack) {
                                                // Also delete the song/episode
                                                const trackId = postToDelete.audioTrack.id;
                                                setSongs(prev => prev.filter(s => s.id !== trackId));
                                                setEpisodes(prev => prev.filter(e => e.id !== trackId));
                                            }
                                            // Delete the post
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
                                    // Add these props to handle music posts in profile
                                    songs={songs}
                                    episodes={episodes}
                                    likedTracks={likedTracks}
                                    onLikeTrack={handleLikeTrack}
                                    onTrackComment={handleTrackComment}
                                    onTrackShare={handleTrackShare}
                                    // Add function to render music posts in profile
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
                                />
                            )}
                            
                            {effectiveView === 'single_post' && activeSinglePostId !== null && (
                                <div className="w-full pt-4 md:px-8 pb-10">
                                    {(() => {
                                        const post = posts.find(p => p.id === activeSinglePostId);
                                        if (!post) return null;
                                        
                                        const author = getAuthorForPost(post, users, brands);
                                        if (!author) return null;
                                        
                                        // Handle music/podcast posts
                                        if ((post.type === 'music' || post.type === 'podcast') && post.audioTrack) {
                                            return renderMusicPost(post, author);
                                        }
                                        
                                        // Handle regular posts
                                        return (
                                            <Post
                                                key={activeSinglePostId}
                                                post={post}
                                                author={author}
                                                currentUser={currentUser}
                                                users={users}
                                                onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }}
                                                onReact={handleReact}
                                                onShare={(id) => setActiveSharePostId(id)}
                                                onViewImage={setFullScreenImage}
                                                onOpenComments={setActiveCommentsPostId}
                                                onVideoClick={() => {}}
                                                onPlayAudioTrack={handlePlayTrack}
                                                onDeletePost={isAdmin ? handleDeletePost : undefined}
                                                isAdmin={isAdmin}
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
                                    onShare={(reelId) => {}} 
                                    onComment={(reelId) => {}} 
                                />
                            )}
                            
                            {effectiveView === 'groups' && (
                                <GroupsPage 
                                    groups={groups} 
                                    currentUser={currentUser} 
                                    initialGroupId={initialGroupIdToView} 
                                    onGroupClick={(groupId) => { setInitialGroupIdToView(groupId); }} 
                                    onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} 
                                    onCreateGroup={handleCreateGroup} 
                                    onJoinGroup={handleJoinGroup} 
                                    onLeaveGroup={handleLeaveGroup} 
                                    onDeleteGroup={handleDeleteGroup} 
                                    onUpdateGroupImage={handleUpdateGroupImage} 
                                    onPostToGroup={handlePostToGroup} 
                                    onReactGroupPost={handleReactGroupPost} 
                                    onUpdateGroupSettings={handleUpdateGroupSettings} 
                                    onRemoveMember={handleRemoveMember} 
                                    onDeleteGroupPost={handleDeleteGroupPost} 
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
                                    // ADMIN FUNCTIONS
                                    onUpdateBrandImage={handleUpdateBrandImage}
                                    onDeletePost={handleDeletePost}
                                    onVerifyBrand={handleVerifyBrand}
                                    initialBrandId={activeBrandId}
                                    onPlayAudioTrack={handlePlayTrack}
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
