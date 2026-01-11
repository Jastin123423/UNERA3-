// App.tsx - Complete with Integrated UNERA APIs
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
import MusicSystem from './components/MusicSystem'; // Changed to default import
import { GroupsPage } from './components/Groups';
import { ToolsPage } from './components/Tools';
import { PrivacyPolicyPage } from './components/PrivacyPolicy';
import { TermsOfServicePage } from './components/TermsOfService';
import { useLanguage } from './contexts/LanguageContext';
import { User, Post as PostType, Story, Reel, Notification, Message, Event, Product, Comment, ReactionType, LinkPreview, Group, GroupPost, AudioTrack, Brand, Song, Episode } from './types';
import { INITIAL_USERS, INITIAL_POSTS, INITIAL_STORIES, INITIAL_REELS, INITIAL_EVENTS, INITIAL_GROUPS, INITIAL_BRANDS, MOCK_SONGS, MOCK_EPISODES } from './constants';
import { rankFeed } from './utils/ranking'; 

// ========== API BASE URL ==========
const API_BASE_URL = 'https://unera.social';

// ========== API HELPER FUNCTIONS ==========
const getAuthToken = (): string | null => {
  return localStorage.getItem('unera_token');
};

const setAuthToken = (token: string): void => {
  localStorage.setItem('unera_token', token);
};

const clearAuthToken = (): void => {
  localStorage.removeItem('unera_token');
};

const apiRequest = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Request failed for ${endpoint}:`, error);
    throw error;
  }
};

// ========== UNERA API ENDPOINTS ==========
const UNERA_API = {
  // 1. Users API
  users: {
    signup: (data: { username: string; email: string; password: string }) =>
      apiRequest('/users/signup', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    login: (data: { email: string; password: string }) =>
      apiRequest('/users/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    getCurrentUser: () =>
      apiRequest('/users/me'),
    
    getUser: (userId: number) =>
      apiRequest(`/users/${userId}`),
    
    updateProfile: (data: Partial<{ username: string; bio: string; avatar_url: string }>) =>
      apiRequest('/users/me', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  // 2. Posts API
  posts: {
    create: (data: { 
      user_id?: number;
      content: string; 
      media_url?: string;
      background?: string;
      feeling?: string;
      location?: string;
      tagged_users?: number[];
      type?: string;
      visibility?: string;
    }) =>
      apiRequest('/posts', {
        method: 'POST',
        body: JSON.stringify({
          content: data.content,
          media_url: data.media_url,
          ...(data.user_id && { user_id: data.user_id })
        }),
      }),
    
    getAll: (params?: { 
      page?: number; 
      limit?: number; 
      user_id?: number;
      type?: string;
    }) => {
      const query = params ? new URLSearchParams(params as any).toString() : '';
      return apiRequest(`/posts${query ? `?${query}` : ''}`);
    },
    
    getById: (postId: number) =>
      apiRequest(`/posts/${postId}`),
    
    delete: (postId: number) =>
      apiRequest(`/posts/${postId}`, {
        method: 'DELETE',
      }),
  },

  // 3. Comments API
  comments: {
    create: (data: { post_id: number; user_id?: number; content: string }) =>
      apiRequest('/comments', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    getAll: (params?: { post_id?: number; user_id?: number }) => {
      const query = params ? new URLSearchParams(params as any).toString() : '';
      return apiRequest(`/comments${query ? `?${query}` : ''}`);
    },
    
    delete: (commentId: number) =>
      apiRequest(`/comments/${commentId}`, {
        method: 'DELETE',
      }),
  },

  // 4. Likes API
  likes: {
    create: (data: { user_id?: number; target_id: number; target_type: 'post' | 'comment' | 'story' | 'reel' }) =>
      apiRequest('/likes', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    delete: (targetId: number, targetType: string) =>
      apiRequest(`/likes?target_id=${targetId}&target_type=${targetType}`, {
        method: 'DELETE',
      }),
    
    getLikes: (targetId: number, targetType: string) =>
      apiRequest(`/likes?target_id=${targetId}&target_type=${targetType}`),
  },

  // 5. Messages API
  messages: {
    send: (data: { 
      sender_id?: number; 
      receiver_id: number; 
      content: string; 
      media_url?: string;
    }) =>
      apiRequest('/messages', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    getConversation: (user1: number, user2: number) =>
      apiRequest(`/messages?user1=${user1}&user2=${user2}`),
    
    getAll: () =>
      apiRequest('/messages'),
  },

  // 6. Groups API
  groups: {
    create: (data: { 
      owner_id?: number; 
      name: string; 
      description: string; 
      privacy: string;
      image_url?: string;
      cover_url?: string;
    }) =>
      apiRequest('/groups', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    getAll: () =>
      apiRequest('/groups'),
    
    getById: (groupId: string) =>
      apiRequest(`/groups/${groupId}`),
    
    join: (groupId: string, userId?: number) =>
      apiRequest(`/groups/${groupId}/join`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      }),
    
    leave: (groupId: string, userId?: number) =>
      apiRequest(`/groups/${groupId}/leave`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      }),
    
    createPost: (groupId: string, data: any) =>
      apiRequest(`/groups/${groupId}/posts`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // 7. Videos API (Reels)
  videos: {
    upload: (data: { 
      user_id?: number;
      title: string; 
      description?: string;
      video_url: string;
      thumbnail_url?: string;
      duration?: number;
    }) =>
      apiRequest('/videos', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    getAll: () =>
      apiRequest('/videos'),
  },

  // 8. Music API
  music: {
    upload: (data: { 
      user_id?: number;
      title: string; 
      artist: string;
      audio_url: string;
      cover_url?: string;
      duration?: number;
      genre?: string;
    }) =>
      apiRequest('/music', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    getAll: () =>
      apiRequest('/music'),
    
    getById: (musicId: string) =>
      apiRequest(`/music/${musicId}`),
    
    delete: (musicId: string) =>
      apiRequest(`/music/${musicId}`, {
        method: 'DELETE',
      }),
  },

  // 9. Brands & Pages API
  brands_pages: {
    create: (data: { 
      owner_id?: number;
      name: string; 
      description: string;
      logo_url?: string;
      category: string;
      website?: string;
      contact_email?: string;
    }) =>
      apiRequest('/brands_pages', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    getAll: () =>
      apiRequest('/brands_pages'),
    
    getById: (brandId: number) =>
      apiRequest(`/brands_pages/${brandId}`),
    
    follow: (brandId: number, userId?: number) =>
      apiRequest(`/brands_pages/${brandId}/follow`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      }),
    
    unfollow: (brandId: number, userId?: number) =>
      apiRequest(`/brands_pages/${brandId}/unfollow`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      }),
    
    createPost: (brandId: number, data: any) =>
      apiRequest(`/brands_pages/${brandId}/posts`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // 10. Events API
  events: {
    create: (data: { 
      creator_id?: number;
      title: string; 
      description: string;
      event_date: string;
      location: string;
      cover_url?: string;
      is_online?: boolean;
      max_attendees?: number;
    }) =>
      apiRequest('/events', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    getAll: () =>
      apiRequest('/events'),
    
    getById: (eventId: number) =>
      apiRequest(`/events/${eventId}`),
    
    attend: (eventId: number, userId?: number) =>
      apiRequest(`/events/${eventId}/attend`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      }),
    
    unattend: (eventId: number, userId?: number) =>
      apiRequest(`/events/${eventId}/unattend`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      }),
  },

  // 11. Podcasts API
  podcasts: {
    upload: (data: { 
      creator_id?: number;
      title: string; 
      description: string;
      audio_url: string;
      cover_url?: string;
      duration?: number;
      episode_number?: number;
    }) =>
      apiRequest('/podcasts', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    getAll: () =>
      apiRequest('/podcasts'),
  },

  // 12. Stories API
  stories: {
    create: (data: { 
      user_id?: number;
      type: 'text' | 'image';
      text_content?: string;
      media_url?: string;
      music_url?: string;
      background_color?: string;
      text_color?: string;
      duration?: number;
    }) =>
      apiRequest('/stories', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    getAll: (params?: { 
      user_id?: number;
      page?: number; 
      limit?: number;
    }) => {
      const query = params ? new URLSearchParams(params as any).toString() : '';
      return apiRequest(`/stories${query ? `?${query}` : ''}`);
    },
    
    view: (storyId: number, userId?: number) =>
      apiRequest(`/stories/${storyId}/view`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      }),
    
    delete: (storyId: number) =>
      apiRequest(`/stories/${storyId}`, {
        method: 'DELETE',
      }),
  },

  // File Upload Helper
  upload: {
    getSignedUrl: async (file: File, type: 'image' | 'video' | 'audio' | 'document'): Promise<string> => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const data = await response.json();
      return data.url;
    },
    
    directUpload: async (file: File): Promise<string> => {
      // For demo, create a blob URL
      return URL.createObjectURL(file);
    },
  },
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

const notificationExists = (notifications: Notification[], userId: number, senderId: number, type: string, postId?: number): boolean => {
    const recentTime = Date.now() - 300000;
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

// ========== MAIN APP COMPONENT ==========
export default function App({ initialData, initialPath }: { initialData?: any, initialPath?: string }) {
    const { t } = useLanguage();

    const [isClient, setIsClient] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [apiError, setApiError] = useState<string | null>(null);
    
    // State
    const [users, setUsers] = useState<User[]>(initialData?.users || INITIAL_USERS);
    const [posts, setPosts] = useState<PostType[]>(() => {
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
    
    // Navigation
    const serverPath = initialPath || '/';
    const clientPath = isClient ? getPath() : serverPath;
    const path = clientPath;
    const parsedPath = useMemo(() => parsePath(path, users), [path, users]);
    const [activeTab, setActiveTab] = useState(parsedPath.view === 'home' ? 'home' : parsedPath.view);
    const [view, setView] = useState(initialData?.view || parsedPath.view);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(initialData?.selectedUserId || parsedPath.userId || null);
    
    // Media
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

    // Memoized values
    const storiesWithUsers = useMemo(() => {
        return stories.map(story => {
            const user = users.find(u => u.id === story.userId);
            return { ...story, user };
        }).sort((a,b) => b.createdAt - a.createdAt);
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

    // ========== API INTEGRATED HANDLERS ==========
    
    // Load data from API on mount
    useEffect(() => {
        const loadDataFromAPI = async () => {
            if (isClient && getAuthToken()) {
                try {
                    setIsLoading(true);
                    
                    // Load current user
                    const userData = await UNERA_API.users.getCurrentUser();
                    if (userData) {
                        setCurrentUser(userData);
                    }
                    
                    // Load posts
                    const postsData = await UNERA_API.posts.getAll();
                    if (postsData && Array.isArray(postsData)) {
                        setPosts(postsData.map((post: any) => ({
                            ...post,
                            formattedTime: formatRelativeTime(post.timestamp || post.createdAt || Date.now())
                        })));
                    }
                    
                    // Load stories
                    const storiesData = await UNERA_API.stories.getAll();
                    if (storiesData && Array.isArray(storiesData)) {
                        setStories(storiesData);
                    }
                    
                    // Load groups
                    const groupsData = await UNERA_API.groups.getAll();
                    if (groupsData && Array.isArray(groupsData)) {
                        setGroups(groupsData);
                    }
                    
                    // Load brands
                    const brandsData = await UNERA_API.brands_pages.getAll();
                    if (brandsData && Array.isArray(brandsData)) {
                        setBrands(brandsData);
                    }
                    
                    // Load music
                    const musicData = await UNERA_API.music.getAll();
                    if (musicData && Array.isArray(musicData)) {
                        setSongs(musicData);
                    }
                    
                } catch (error) {
                    console.error('Failed to load data from API:', error);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setTimeout(() => setIsLoading(false), 800);
            }
        };
        
        if (isClient) {
            loadDataFromAPI();
        }
    }, [isClient]);

    // ========== AUTH HANDLERS ==========
    const handleLogin = async (email: string, password: string) => {
        try {
            setApiError(null);
            const data = await UNERA_API.users.login({ email, password });
            
            if (data.token && data.user) {
                setAuthToken(data.token);
                setCurrentUser(data.user);
                setView('home');
                setActiveTab('home');
                setLoginError('');
                setShowRegister(false);
                setShowForgotPassword(false);
                
                // Load user data
                const postsData = await UNERA_API.posts.getAll();
                if (postsData) {
                    setPosts(postsData.map((post: any) => ({
                        ...post,
                        formattedTime: formatRelativeTime(post.timestamp || post.createdAt || Date.now())
                    })));
                }
                
                if (isClient) window.history.pushState({}, '', '/');
            } else {
                setLoginError('Invalid response from server');
            }
        } catch (error: any) {
            setLoginError(error.message || 'Login failed');
            setApiError(error.message);
        }
    };

    const handleRegister = async (newUser: Partial<User>) => {
        try {
            setApiError(null);
            const { username, email, password } = newUser;
            if (!username || !email || !password) {
                setLoginError('All fields are required');
                return;
            }
            
            const data = await UNERA_API.users.signup({ username, email, password });
            
            if (data.token && data.user) {
                setAuthToken(data.token);
                setCurrentUser(data.user);
                setUsers(prev => [...prev, data.user]);
                setShowRegister(false);
                setShowForgotPassword(false);
                setView('home');
                
                if (isClient) window.history.pushState({}, '', '/');
            }
        } catch (error: any) {
            setLoginError(error.message || 'Registration failed');
            setApiError(error.message);
        }
    };

    const handleLogout = () => {
        clearAuthToken();
        setCurrentUser(null);
        if (isClient) {
            localStorage.removeItem('universeCurrentUser');
            window.history.pushState({}, '', '/');
        }
        setView('login');
        setCurrentAudioTrack(null);
        setIsAudioPlaying(false);
    };

    // ========== POST HANDLERS ==========
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
            alert("Please login to create a post");
            return;
        }
        
        try {
            setApiError(null);
            let media_url = undefined;
            
            // Handle file upload if present
            if (files && files.length > 0) {
                const file = files[0];
                media_url = await UNERA_API.upload.directUpload(file);
            }
            
            const postData: any = {
                content: text,
                type: type === 'multimage' ? 'image' : type,
                visibility,
                ...(media_url && { media_url }),
                ...(location && { location }),
                ...(feeling && { feeling }),
                ...(taggedUsers && taggedUsers.length > 0 && { tagged_users: taggedUsers }),
                ...(background && { background }),
            };
            
            const data = await UNERA_API.posts.create(postData);
            
            if (data) {
                const newPost: PostType = {
                    ...data,
                    formattedTime: formatRelativeTime(data.timestamp || Date.now()),
                    reactions: [],
                    comments: [],
                    shares: 0,
                    views: 0,
                    authorId: currentUser.id,
                };
                
                setPosts(prev => [newPost, ...prev]);
                
                // Notify tagged users
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
                
                alert("Post created successfully!");
            }
        } catch (error: any) {
            setApiError(error.message);
            alert(`Failed to create post: ${error.message}`);
        }
    };

    const handleDeletePost = async (postId: number) => {
        if (!currentUser) {
            alert("Please login to delete posts.");
            return;
        }
        
        try {
            setApiError(null);
            await UNERA_API.posts.delete(postId);
            
            setPosts(prev => prev.filter(p => p.id !== postId));
            
            // Remove from brand posts if applicable
            const post = posts.find(p => p.id === postId);
            if (post?.brandId) {
                setBrands(prev => prev.map(brand => ({
                    ...brand,
                    posts: brand.id === post.brandId 
                        ? (brand.posts || []).filter(id => id !== postId)
                        : (brand.posts || [])
                })));
            }
            
            alert("Post deleted successfully!");
        } catch (error: any) {
            setApiError(error.message);
            alert(`Failed to delete post: ${error.message}`);
        }
    };

    // ========== STORY HANDLERS ==========
    const handleCreateStory = async (storyData: Partial<Story>) => {
        if (!currentUser) return;
        
        try {
            setApiError(null);
            let media_url = undefined;
            
            if (storyData.mediaFile) {
                media_url = await UNERA_API.upload.directUpload(storyData.mediaFile);
            }
            
            const data = await UNERA_API.stories.create({
                type: storyData.type || 'text',
                text_content: storyData.text,
                media_url,
                music_url: storyData.musicUrl,
                background_color: storyData.backgroundColor,
                text_color: storyData.textColor,
            });
            
            if (data) {
                const newStory: Story = {
                    ...data,
                    user: currentUser,
                    createdAt: Date.now(),
                };
                
                setStories(prev => [newStory, ...prev]);
                setShowCreateStoryModal(false);
                alert("Story created successfully!");
            }
        } catch (error: any) {
            setApiError(error.message);
            alert(`Failed to create story: ${error.message}`);
        }
    };

    // ========== COMMENT HANDLERS ==========
    const handleComment = async (itemId: number, text: string, attachment?: any, parentId?: number) => {
        if (!currentUser) return;
        
        try {
            setApiError(null);
            const data = await UNERA_API.comments.create({
                post_id: itemId,
                content: text,
            });
            
            if (data) {
                const timestamp = Date.now();
                const formattedTime = formatRelativeTime(timestamp);
                const newComment: Comment = {
                    id: timestamp,
                    userId: currentUser.id,
                    text,
                    timestamp,
                    formattedTime,
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
                
                // Send notification
                const post = posts.find(p => p.id === itemId);
                if (post && post.authorId !== currentUser.id) {
                    handleCreateNotification(
                        post.authorId,
                        currentUser.id,
                        'comment_post',
                        'commented on your post.',
                        { postId: itemId, commentId: newComment.id }
                    );
                }
            }
        } catch (error: any) {
            setApiError(error.message);
        }
    };

    // ========== LIKE HANDLERS ==========
    const handleReact = async (itemId: number, type: ReactionType) => {
        if (!currentUser) {
            alert("Please login to react.");
            return;
        }
        
        try {
            setApiError(null);
            
            // Check if already liked
            const post = posts.find(p => p.id === itemId);
            const existingReaction = post?.reactions.find(r => r.userId === currentUser.id);
            
            if (existingReaction) {
                // Unlike
                await UNERA_API.likes.delete(itemId, 'post');
                setPosts(prev => prev.map(p => 
                    p.id === itemId 
                        ? { ...p, reactions: p.reactions.filter(r => r.userId !== currentUser.id) }
                        : p
                ));
            } else {
                // Like
                await UNERA_API.likes.create({
                    target_id: itemId,
                    target_type: 'post'
                });
                
                setPosts(prev => prev.map(p => {
                    if (p.id === itemId) {
                        const newReactions = [...p.reactions, { userId: currentUser.id, type }];
                        
                        // Send notification
                        if (p.authorId !== currentUser.id) {
                            handleCreateNotification(
                                p.authorId,
                                currentUser.id,
                                'like_post',
                                'liked your post.',
                                { postId: itemId, reactionType: type }
                            );
                        }
                        
                        return { ...p, reactions: newReactions };
                    }
                    return p;
                }));
            }
        } catch (error: any) {
            setApiError(error.message);
        }
    };

    // ========== GROUP HANDLERS ==========
    const handleCreateGroup = async (groupData: Partial<Group>) => {
        if (!currentUser) return;
        
        try {
            setApiError(null);
            const data = await UNERA_API.groups.create({
                name: groupData.name || 'New Group',
                description: groupData.description || '',
                privacy: groupData.privacy || 'public',
            });
            
            if (data) {
                const newGroup: Group = {
                    ...data,
                    adminId: currentUser.id,
                    members: [currentUser.id],
                    posts: [],
                    createdDate: Date.now(),
                    image: groupData.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(groupData.name || 'Group')}&background=random&size=150`,
                    coverImage: groupData.coverImage || 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80',
                    events: [],
                    memberPostingAllowed: true
                };
                
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
        } catch (error: any) {
            setApiError(error.message);
            alert(`Failed to create group: ${error.message}`);
        }
    };

    const handleJoinGroup = async (groupId: string) => {
        if (!currentUser) return;
        
        try {
            setApiError(null);
            await UNERA_API.groups.join(groupId);
            
            setGroups(prev => prev.map(g => 
                (g.id === groupId && !g.members.includes(currentUser.id)) 
                    ? { ...g, members: [...g.members, currentUser.id] } 
                    : g
            ));
            
            // Notify group admin
            const group = groups.find(g => g.id === groupId);
            if (group && group.adminId !== currentUser.id) {
                handleCreateNotification(
                    group.adminId,
                    currentUser.id,
                    'group_join',
                    `joined your group ${group.name}.`,
                    { groupId }
                );
            }
            
            alert("Joined group successfully!");
        } catch (error: any) {
            setApiError(error.message);
        }
    };

    // ========== BRAND HANDLERS ==========
    const handleCreateBrand = async (brandData: Partial<Brand>) => {
        if (!currentUser) {
            alert("Please login to create a brand page.");
            return;
        }
        
        try {
            setApiError(null);
            const data = await UNERA_API.brands_pages.create({
                name: brandData.name || 'New Brand',
                description: brandData.description || '',
                category: brandData.category || 'Business',
                logo_url: brandData.profileImage,
            });
            
            if (data) {
                const newBrand: Brand = {
                    ...data,
                    adminId: currentUser.id,
                    followers: [currentUser.id],
                    isVerified: false,
                    posts: [],
                    createdAt: Date.now(),
                    profileImage: brandData.profileImage || `https://ui-avatars.com/api/?name=${brandData.name || 'Brand'}&background=random&size=150`,
                    coverImage: brandData.coverImage || 'https://images.unsplash.com/photo-1557683316-973673baf926?ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80'
                };
                
                setBrands(prev => [newBrand, ...prev]);
                
                // Follow the brand
                await UNERA_API.brands_pages.follow(newBrand.id);
                
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
            }
        } catch (error: any) {
            setApiError(error.message);
            alert(`Failed to create brand: ${error.message}`);
        }
    };

    const handleFollowBrand = async (brandId: number) => {
        if (!currentUser) {
            alert("Login to follow brands.");
            return;
        }
        
        try {
            setApiError(null);
            const brand = brands.find(b => b.id === brandId);
            const isFollowing = brand?.followers.includes(currentUser.id);
            
            if (isFollowing) {
                await UNERA_API.brands_pages.unfollow(brandId);
                setBrands(prev => prev.map(b => 
                    b.id === brandId 
                        ? { ...b, followers: b.followers.filter(id => id !== currentUser.id) } 
                        : b
                ));
                
                // Update user's following list
                setCurrentUser(prev => prev ? {
                    ...prev,
                    following: prev.following.filter(id => id !== brandId)
                } : prev);
            } else {
                await UNERA_API.brands_pages.follow(brandId);
                setBrands(prev => prev.map(b => 
                    b.id === brandId 
                        ? { ...b, followers: [...b.followers, currentUser.id] } 
                        : b
                ));
                
                // Update user's following list
                setCurrentUser(prev => prev ? {
                    ...prev,
                    following: [...prev.following, brandId]
                } : prev);
                
                // Send notification to brand admin
                if (brand && brand.adminId !== currentUser.id) {
                    handleCreateNotification(
                        brand.adminId,
                        currentUser.id,
                        'brand_follow',
                        `followed your brand ${brand.name}.`,
                        { brandId }
                    );
                }
            }
        } catch (error: any) {
            setApiError(error.message);
        }
    };

    // ========== EVENT HANDLERS ==========
    const handleCreateEvent = async (eventData: Partial<Event>) => {
        if (!currentUser) return;
        
        try {
            setApiError(null);
            const data = await UNERA_API.events.create({
                title: eventData.title || 'New Event',
                description: eventData.description || '',
                event_date: eventData.date ? new Date(eventData.date).toISOString() : new Date().toISOString(),
                location: eventData.location || 'Online',
                cover_url: eventData.coverImage,
            });
            
            if (data) {
                const newEvent: Event = {
                    ...data,
                    attendees: [currentUser.id],
                    interestedIds: []
                };
                
                setEvents(prev => [newEvent, ...prev]);
                
                // Create event post
                const timestamp = Date.now();
                const formattedTime = formatRelativeTime(timestamp);
                const eventPost: PostType = {
                    id: timestamp + 1,
                    authorId: currentUser.id,
                    content: `is hosting a new event: ${newEvent.title}`,
                    timestamp,
                    formattedTime,
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
                setShowCreateEventModal(false);
                alert("Event created successfully!");
            }
        } catch (error: any) {
            setApiError(error.message);
            alert(`Failed to create event: ${error.message}`);
        }
    };

    // ========== MUSIC HANDLERS ==========
    const handleAddSong = async (song: Song) => {
        try {
            setApiError(null);
            const data = await UNERA_API.music.upload({
                title: song.title,
                artist: song.artist,
                audio_url: song.audioUrl || '',
                cover_url: song.cover,
                duration: song.duration,
            });
            
            if (data) {
                const newSong: Song = {
                    ...data,
                    plays: 0,
                    likes: 0,
                    shares: 0,
                    comments: 0,
                    uploadDate: new Date().toISOString(),
                    stats: {
                        plays: 0,
                        likes: 0,
                        shares: 0,
                        comments: 0,
                        downloads: 0,
                        reelsUse: 0
                    }
                };
                
                setSongs(prev => [newSong, ...prev]);
                
                // Create music post
                if (currentUser) {
                    const timestamp = Date.now();
                    const formattedTime = formatRelativeTime(timestamp);
                    const audioTrack: AudioTrack = {
                        id: newSong.id,
                        title: newSong.title,
                        artist: newSong.artist,
                        duration: newSong.duration || 180,
                        url: newSong.audioUrl || '',
                        uploaderId: currentUser.id,
                        cover: newSong.cover || '/default-cover.jpg',
                        type: 'music',
                        isVerified: true,
                        plays: 0,
                        likes: 0,
                        shares: 0
                    };
                    
                    const newPost: PostType = {
                        id: timestamp,
                        authorId: currentUser.id,
                        content: `🎵 Just released new music: "${newSong.title}" by ${newSong.artist}`,
                        timestamp,
                        formattedTime,
                        createdAt: timestamp,
                        reactions: [],
                        comments: [],
                        shares: 0,
                        views: 0,
                        type: 'music',
                        visibility: 'Public',
                        audioTrack
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
                
                alert("Song uploaded successfully!");
            }
        } catch (error: any) {
            setApiError(error.message);
            alert(`Failed to upload song: ${error.message}`);
        }
    };

    // ========== NOTIFICATION HANDLERS ==========
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
        
        if (typeof Audio !== 'undefined' && currentUser?.id === userId) {
            const audio = new Audio('/notification.mp3');
            audio.volume = 0.3;
            audio.play().catch(() => {});
        }
    }, [notifications, currentUser?.id]);

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

    // ========== OTHER HANDLERS (Keep existing) ==========
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

    const handleFollowUser = (userIdToToggle: number) => {
        if (!currentUser) {
            alert("Please login to follow users.");
            return;
        }
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

    const handleCreateProduct = (productData: Partial<Product>) => {
        console.log("Creating product with data:", productData);
        
        if (!currentUser) {
            alert("Please login to create a product listing.");
            return;
        }

        const generateShareId = () => {
            return 'prod_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        };

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
        
        setProducts(prev => [...prev, newProduct]);
        
        const followers = currentUser.followers || [];
        followers.forEach(followerId => {
            if (followerId !== currentUser.id) {
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

    const handleLikeStory = (storyId: number) => {
        if (!currentUser) { alert("Please login to like stories."); return; }
        setStories(prev => prev.map(s => {
            if (s.id === storyId) {
                const reactions = s.reactions || [];
                const existingLike = reactions.find(r => r.userId === currentUser!.id);
                if (existingLike) {
                    return { ...s, reactions: reactions.filter(r => r.userId !== currentUser!.id) };
                } else {
                    if (s.userId !== currentUser.id) {
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
    };
    
    const handleReplyStory = (storyId: number, text: string) => {
        if (!currentUser) { alert("Please login to reply."); return; }
        setStories(prev => prev.map(s => {
            if (s.id === storyId) {
                const replies = s.replies || [];
                const newReply = { userId: currentUser!.id, text, timestamp: Date.now() };
                
                if (s.userId !== currentUser.id) {
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
                
                if (ev.organizerId !== currentUser.id) {
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
                    
                    if (reel.userId !== currentUser.id) {
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
    };

    const handleShare = (postId: number, targetType: 'profile' | 'group' | 'brand', targetId?: string | number, extraCaption?: string) => {
        if (!currentUser) return;
        const sourcePost = posts.find(p => p.id === postId);
        if (!sourcePost) return;
        
        if (sourcePost.authorId !== currentUser.id) {
            handleCreateNotification(
                sourcePost.authorId,
                currentUser.id,
                'share_post',
                'shared your post.',
                { postId: postId }
            );
        }
        
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

    const handleLikeTrack = (trackId: string, isLiked: boolean) => {
        setLikedTracks(prev => 
            isLiked 
                ? prev.filter(id => id !== trackId)
                : [...prev, trackId]
        );
        
        const track = songs.find(s => s.id === trackId) || episodes.find(e => e.id === trackId);
        if (track) {
            if ('artist' in track) {
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
                
                if (!isLiked && track.uploaderId && track.uploaderId !== currentUser?.id) {
                    handleCreateNotification(
                        track.uploaderId,
                        currentUser!.id,
                        'music_like',
                        `liked your song "${track.title}"`,
                        { songId: trackId }
                    );
                }
            } else {
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

    const handleTrackComment = (trackId: string) => {
        const track = songs.find(s => s.id === trackId) || episodes.find(e => e.id === trackId);
        if (track) {
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
        }
    };

    const handleTrackShare = (trackId: string) => {
        const track = songs.find(s => s.id === trackId) || episodes.find(e => e.id === trackId);
        if (track) {
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
        }
    };

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
                        
                        if (p.authorId !== currentUser.id) {
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

        const mentionRegex = /@(\w+(?:\s\w+)?)/g;
        const mentions = [...text.matchAll(mentionRegex)];
        if (mentions.length > 0) {
            const mentionedUserIds = new Set<number>();
            mentions.forEach(match => {
                const userName = match[1];
                const user = users.find(u => u.name.toLowerCase() === userName.toLowerCase());
                if (user && user.id !== currentUser.id) {
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
        
        const group = groups.find(g => g.id === groupId);
        userIds.forEach(userId => {
            if (userId !== currentUser.id) {
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
        
        console.log("Creating group post:", newFeedPost);
        
        setPosts(prev => [newFeedPost, ...prev]); 
        
        const group = groups.find(g => g.id === groupId);
        if (group && group.memberPostingAllowed) {
            group.members.forEach(memberId => {
                if (memberId !== currentUser.id) {
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
        
        if (groupPost.authorId !== currentUser.id) {
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
                            
                            if (p.authorId !== currentUser.id) {
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
    };
    
    const handleOpenGroupComments = (groupId: string, postId: number) => {
        console.log('Opening group comments:', { groupId, postId });
        setActiveGroupComments({ groupId, postId });
    };
    
    const handleShareGroupPost = (groupId: string, postId: number) => {
        console.log('Sharing group post:', { groupId, postId });
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
            
            handleCreateNotification(
                memberId,
                currentUser.id,
                'group_removed',
                `removed you from ${group.name}.`,
                { groupId }
            );
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
            const storedGroups = localStorage.getItem('universeGroups');
            const storedNotifications = localStorage.getItem('universeNotifications');
            
            if (storedUsers) setUsers(JSON.parse(storedUsers));
            if (storedSongs) setSongs(JSON.parse(storedSongs));
            if (storedEpisodes) setEpisodes(JSON.parse(storedEpisodes));
            if (storedLikedTracks) setLikedTracks(JSON.parse(storedLikedTracks));
            if (storedProducts) setProducts(JSON.parse(storedProducts));
            if (storedBrands) setBrands(JSON.parse(storedBrands));
            if (storedPosts) {
                const parsedPosts = JSON.parse(storedPosts);
                const postsWithFormattedTime = parsedPosts.map((post: PostType) => ({
                    ...post,
                    formattedTime: post.formattedTime || formatRelativeTime(post.timestamp || post.createdAt || Date.now())
                }));
                setPosts(postsWithFormattedTime);
            }
            if (storedGroups) setGroups(JSON.parse(storedGroups));
            if (storedNotifications) setNotifications(JSON.parse(storedNotifications));
            
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
            localStorage.setItem('universeSongs', JSON.stringify(songs));
            localStorage.setItem('universeEpisodes', JSON.stringify(episodes));
            localStorage.setItem('universeLikedTracks', JSON.stringify(likedTracks));
            localStorage.setItem('marketplaceProducts', JSON.stringify(products));
            localStorage.setItem('universeBrands', JSON.stringify(brands));
            localStorage.setItem('universePosts', JSON.stringify(posts));
            localStorage.setItem('universeGroups', JSON.stringify(groups));
            localStorage.setItem('universeNotifications', JSON.stringify(notifications));
        }
    }, [users, songs, episodes, likedTracks, products, brands, posts, groups, notifications, isClient]);

    // Birthday notification check
    useEffect(() => {
        const checkBirthdays = () => {
            if (!currentUser) return;
            
            const today = new Date();
            const todayStr = `${today.getMonth() + 1}/${today.getDate()}`;
            
            users.forEach(user => {
                if (user.birthDate && user.id !== currentUser.id) {
                    const birthDate = new Date(user.birthDate);
                    const birthStr = `${birthDate.getMonth() + 1}/${birthDate.getDate()}`;
                    
                    if (birthStr === todayStr) {
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
        
        checkBirthdays();
        const interval = setInterval(checkBirthdays, 24 * 60 * 60 * 1000);
        
        return () => clearInterval(interval);
    }, [currentUser, users, notifications, handleCreateNotification]);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const effectiveView = isClient ? view : (initialData?.view || parsedPath.view);
    
    // Function to render music/podcast posts - REMOVED MusicFeedPost usage
    const renderMusicPost = (post: PostType, author: any) => {
        const song = getSongForPost(post, songs, episodes);
        if (!song) return null;
        
        // Instead of MusicFeedPost, we'll render a regular post with audio
        return (
            <Post 
                key={post.id} 
                post={{...post, formattedTime: post.formattedTime || formatRelativeTime(post.timestamp || post.createdAt || Date.now())}}
                author={author as any} 
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
                onViewImage={(url) => setFullScreenImage(url)} 
                onOpenComments={(postId) => setActiveCommentsPostId(postId)} 
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
            />
        );
    };

    // Function to render regular posts with brand support
    const renderRegularPost = (post: PostType, author: any, isFollowing?: boolean) => {
        const isBrandAuthor = author?.type === 'brand';
        const isFollowingBrand = isBrandAuthor && currentUser ? 
            brands.find(b => b.id === author.id)?.followers.includes(currentUser.id) || false : 
            false;
        
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
            />
        );
    };
    
    // Helper function for GlobalAudioPlayer component
    const GlobalAudioPlayerComponent = ({ currentTrack, isPlaying, onTogglePlay, onNext, onPrevious, onClose, onDownload, onLike, isLiked, uploaderProfile, onArtistClick }: any) => {
        return (
            <div className="fixed bottom-0 left-0 right-0 bg-[#242526] border-t border-gray-700 p-4 z-50">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <img 
                            src={currentTrack.cover || '/default-cover.jpg'} 
                            alt={currentTrack.title}
                            className="w-12 h-12 rounded"
                        />
                        <div>
                            <h4 className="text-white font-medium">{currentTrack.title}</h4>
                            <p 
                                className="text-gray-400 text-sm cursor-pointer hover:text-white"
                                onClick={() => onArtistClick && onArtistClick(currentTrack.uploaderId)}
                            >
                                {currentTrack.artist}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                        <button 
                            onClick={onTogglePlay}
                            className="text-white hover:text-[#1877F2]"
                        >
                            {isPlaying ? '⏸️' : '▶️'}
                        </button>
                        
                        <button 
                            onClick={() => onLike && onLike(currentTrack.id)}
                            className={`${isLiked ? 'text-[#1877F2]' : 'text-gray-400'} hover:text-white`}
                        >
                            {isLiked ? '❤️' : '🤍'}
                        </button>
                        
                        <button 
                            onClick={onDownload}
                            className="text-gray-400 hover:text-white"
                        >
                            ⬇️
                        </button>
                        
                        <button 
                            onClick={onClose}
                            className="text-gray-400 hover:text-white"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            </div>
        );
    };
    
    return (
        <div className="bg-[#18191A] min-h-screen flex flex-col font-sans">
            {isLoading ? (
                <div className="flex items-center justify-center min-h-screen bg-[#18191A] flex-col">
                    <div className="w-20 h-20 border-4 border-[#1877F2] border-t-transparent rounded-full animate-spin mb-4"></div>
                    <div className="text-[#1877F2] font-bold text-xl animate-pulse">Loading UNERA...</div>
                    {apiError && (
                        <div className="mt-4 p-3 bg-red-900/30 text-red-300 rounded-lg">
                            API Error: {apiError}
                        </div>
                    )}
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
                        <GlobalAudioPlayerComponent 
                            currentTrack={currentAudioTrack} 
                            isPlaying={isAudioPlaying} 
                            onTogglePlay={() => setIsAudioPlaying(!isAudioPlaying)} 
                            onNext={() => {}} 
                            onPrevious={() => {}} 
                            onClose={() => { setCurrentAudioTrack(null); setIsAudioPlaying(false); }} 
                            onDownload={() => alert("Download started...")} 
                            onLike={(id: string) => handleLikeTrack(id, likedTracks.includes(id))} 
                            isLiked={likedTracks.includes(currentAudioTrack.id)} 
                            uploaderProfile={users.find(u => u.id === currentAudioTrack.uploaderId)} 
                            onArtistClick={(id: number) => { setSelectedUserId(id); setView('profile'); }} 
                        />
                    )}
                    
                    {apiError && (
                        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50">
                            <div className="bg-red-900 text-red-100 px-4 py-2 rounded-lg shadow-lg">
                                API Error: {apiError}
                                <button 
                                    onClick={() => setApiError(null)}
                                    className="ml-3 text-red-300 hover:text-white"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
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
                                        return renderMusicPost(post, author);
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
                                                
                                                if (reel.userId !== currentUser.id) {
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
                                        
                                        const reel = reels.find(r => r.id === reelId);
                                        if (reel && reel.userId !== currentUser.id) {
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
                                    onPostAsBrand={() => {}} // Removed handlePostAsBrand
                                    onReact={handleReact}
                                    onShare={(id) => setActiveSharePostId(id)}
                                    onOpenComments={(postId) => setActiveCommentsPostId(postId)}
                                    onUpdateBrand={() => {}} // Removed handleUpdateBrand
                                    onDeleteBrand={() => {}} // Removed handleDeleteBrand
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
                                    onUpdateBrandImage={() => {}} // Removed handleUpdateBrandImage
                                    onDeletePost={handleDeletePost}
                                    onVerifyBrand={() => {}} // Removed handleVerifyBrand
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
                                    onAddEpisode={() => {}} // Removed handleAddEpisode
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
                                        groups={groups.filter(g => g.id !== groupId)} 
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
